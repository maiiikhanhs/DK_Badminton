package com.dk.badminton;

import android.Manifest;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

@CapacitorPlugin(
    name = "SaveImage",
    permissions = {
        @Permission(alias = "storage", strings = { Manifest.permission.WRITE_EXTERNAL_STORAGE })
    }
)
public class SaveImagePlugin extends Plugin {
    private static final String DEFAULT_ALBUM = "DK Badminton";

    @PluginMethod
    public void savePng(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q && getPermissionState("storage") != PermissionState.GRANTED) {
            requestPermissionForAlias("storage", call, "storagePermissionCallback");
            return;
        }

        String encodedData = call.getString("data");
        String requestedName = call.getString("fileName");
        String requestedAlbum = call.getString("album", DEFAULT_ALBUM);

        if (encodedData == null || encodedData.isEmpty()) {
            call.reject("Dữ liệu ảnh không hợp lệ.");
            return;
        }

        String fileName = sanitizeFileName(requestedName);
        String album = sanitizeAlbum(requestedAlbum);

        final byte[] bytes;
        try {
            bytes = Base64.decode(encodedData, Base64.DEFAULT);
        } catch (IllegalArgumentException error) {
            call.reject("Dữ liệu ảnh không hợp lệ.", error);
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            saveWithMediaStore(call, bytes, fileName, album);
        } else {
            saveLegacy(call, bytes, fileName, album);
        }
    }

    @PermissionCallback
    private void storagePermissionCallback(PluginCall call) {
        if (getPermissionState("storage") == PermissionState.GRANTED) {
            savePng(call);
        } else {
            call.reject("Cần cấp quyền bộ nhớ để lưu ảnh vào Thư viện.");
        }
    }

    private void saveWithMediaStore(PluginCall call, byte[] bytes, String fileName, String album) {
        ContentResolver resolver = getContext().getContentResolver();
        ContentValues values = new ContentValues();
        values.put(MediaStore.Images.Media.DISPLAY_NAME, fileName);
        values.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
        values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/" + album);
        values.put(MediaStore.Images.Media.IS_PENDING, 1);

        Uri uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
        if (uri == null) {
            call.reject("Không thể tạo ảnh trong Thư viện.");
            return;
        }

        try (OutputStream output = resolver.openOutputStream(uri)) {
            if (output == null) throw new IllegalStateException("Không thể mở tệp ảnh.");
            output.write(bytes);
            output.flush();

            values.clear();
            values.put(MediaStore.Images.Media.IS_PENDING, 0);
            resolver.update(uri, values, null, null);
            resolveSaved(call, uri.toString());
        } catch (Exception error) {
            resolver.delete(uri, null, null);
            call.reject("Không thể lưu ảnh vào Thư viện.", error);
        }
    }

    @SuppressWarnings("deprecation")
    private void saveLegacy(PluginCall call, byte[] bytes, String fileName, String album) {
        File pictures = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES);
        File albumDirectory = new File(pictures, album);
        if (!albumDirectory.exists() && !albumDirectory.mkdirs()) {
            call.reject("Không thể tạo album ảnh.");
            return;
        }

        File imageFile = new File(albumDirectory, fileName);
        try (FileOutputStream output = new FileOutputStream(imageFile)) {
            output.write(bytes);
            output.flush();
        } catch (Exception error) {
            call.reject("Không thể lưu ảnh vào Thư viện.", error);
            return;
        }

        MediaScannerConnection.scanFile(
            getContext(),
            new String[] { imageFile.getAbsolutePath() },
            new String[] { "image/png" },
            (path, uri) -> resolveSaved(call, uri != null ? uri.toString() : Uri.fromFile(imageFile).toString())
        );
    }

    private void resolveSaved(PluginCall call, String uri) {
        JSObject result = new JSObject();
        result.put("uri", uri);
        call.resolve(result);
    }

    private String sanitizeFileName(String value) {
        String fallback = "DK-Badminton.png";
        if (value == null || value.trim().isEmpty()) return fallback;
        String sanitized = value.replaceAll("[^A-Za-z0-9._-]", "_");
        return sanitized.toLowerCase().endsWith(".png") ? sanitized : sanitized + ".png";
    }

    private String sanitizeAlbum(String value) {
        if (value == null || value.trim().isEmpty()) return DEFAULT_ALBUM;
        String sanitized = value.replaceAll("[\\\\/:*?\"<>|]", "_").trim();
        return sanitized.isEmpty() ? DEFAULT_ALBUM : sanitized;
    }
}
