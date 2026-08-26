var OTP_CONFIG = Object.freeze({
  ttlSeconds: 300,
  resendSeconds: 60,
  maxAttempts: 5,
  senderName: 'DK Badminton',
});

function doGet() {
  return jsonResponse_({
    ok: true,
    service: 'DK Badminton OTP',
    version: 1,
  });
}

function doPost(event) {
  try {
    var request = parseRequest_(event);
    if (request.action === 'sendOtp') {
      return jsonResponse_(sendOtp_(request.email));
    }
    if (request.action === 'verifyOtp') {
      return jsonResponse_(verifyOtp_(request.email, request.otp));
    }
    return jsonResponse_(error_('INVALID_ACTION', 'Yêu cầu không hợp lệ.'));
  } catch (reason) {
    console.error(reason && reason.stack ? reason.stack : reason);
    return jsonResponse_(error_('INTERNAL_ERROR', 'Dịch vụ OTP đang gặp lỗi. Vui lòng thử lại.'));
  }
}

function authorizeGmail() {
  GmailApp.getAliases();
  console.log('Đã cấp quyền Gmail cho DK Badminton OTP.');
}

function sendOtp_(rawEmail) {
  var email = normalizeEmail_(rawEmail);
  if (!isGmail_(email)) {
    return error_('INVALID_EMAIL', 'Chỉ chấp nhận địa chỉ @gmail.com.');
  }

  var cache = CacheService.getScriptCache();
  var key = emailKey_(email);
  var cooldownKey = 'cooldown:' + key;
  var otpKey = 'otp:' + key;
  var cooldown = readJson_(cache.get(cooldownKey));
  var now = Date.now();
  if (cooldown && cooldown.nextAllowedAt > now) {
    return error_('TOO_MANY_REQUESTS', 'Vui lòng chờ trước khi gửi lại mã.', {
      retryAfter: Math.ceil((cooldown.nextAllowedAt - now) / 1000),
    });
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    cooldown = readJson_(cache.get(cooldownKey));
    now = Date.now();
    if (cooldown && cooldown.nextAllowedAt > now) {
      return error_('TOO_MANY_REQUESTS', 'Vui lòng chờ trước khi gửi lại mã.', {
        retryAfter: Math.ceil((cooldown.nextAllowedAt - now) / 1000),
      });
    }

    var otp = generateOtp_();
    var expiresAt = now + OTP_CONFIG.ttlSeconds * 1000;
    cache.put(otpKey, JSON.stringify({
      hash: hashOtp_(email, otp),
      expiresAt: expiresAt,
      attempts: 0,
    }), OTP_CONFIG.ttlSeconds);
    cache.put(cooldownKey, JSON.stringify({
      nextAllowedAt: now + OTP_CONFIG.resendSeconds * 1000,
    }), OTP_CONFIG.resendSeconds);

    try {
      GmailApp.sendEmail(
        email,
        'Mã xác minh DK Badminton',
        'Mã xác minh DK Badminton của bạn là: ' + otp +
          '\n\nMã có hiệu lực trong 5 phút. Không chia sẻ mã này với bất kỳ ai.',
        {
          name: OTP_CONFIG.senderName,
          htmlBody:
            '<div style="font-family:Arial,sans-serif;max-width:520px;padding:24px;color:#123d2c">' +
            '<h2 style="margin:0 0 12px">DK Badminton</h2>' +
            '<p>Mã xác minh của bạn:</p>' +
            '<div style="margin:18px 0;padding:16px;background:#eff6e9;border-left:5px solid #bfe944;' +
            'font-size:32px;font-weight:700;letter-spacing:8px">' + otp + '</div>' +
            '<p>Mã có hiệu lực trong <strong>5 phút</strong>.</p>' +
            '<p style="color:#6d7e75;font-size:13px">Không chia sẻ mã này với bất kỳ ai. ' +
            'Nếu bạn không yêu cầu mã, hãy bỏ qua email này.</p></div>',
        }
      );
    } catch (sendError) {
      cache.remove(otpKey);
      cache.remove(cooldownKey);
      throw sendError;
    }

    return {
      ok: true,
      expiresIn: OTP_CONFIG.ttlSeconds,
      resendAfter: OTP_CONFIG.resendSeconds,
      message: 'Mã xác minh đã được gửi tới Gmail của bạn.',
    };
  } finally {
    lock.releaseLock();
  }
}

function verifyOtp_(rawEmail, rawOtp) {
  var email = normalizeEmail_(rawEmail);
  var otp = String(rawOtp || '').trim();
  if (!isGmail_(email)) {
    return error_('INVALID_EMAIL', 'Địa chỉ Gmail không hợp lệ.');
  }
  if (!/^\d{6}$/.test(otp)) {
    return error_('INVALID_OTP_FORMAT', 'Mã xác minh phải gồm 6 chữ số.');
  }

  var cache = CacheService.getScriptCache();
  var otpKey = 'otp:' + emailKey_(email);
  var lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    var record = readJson_(cache.get(otpKey));
    var now = Date.now();
    if (!record || !record.hash || record.expiresAt <= now) {
      cache.remove(otpKey);
      return error_('OTP_EXPIRED', 'Mã xác minh đã hết hạn. Hãy gửi mã mới.');
    }

    if (!constantTimeEquals_(record.hash, hashOtp_(email, otp))) {
      record.attempts = Number(record.attempts || 0) + 1;
      var remainingAttempts = Math.max(0, OTP_CONFIG.maxAttempts - record.attempts);
      if (remainingAttempts === 0) {
        cache.remove(otpKey);
        return error_('OTP_LOCKED', 'Bạn đã nhập sai quá nhiều lần. Hãy gửi mã mới.', {
          remainingAttempts: 0,
        });
      }
      cache.put(
        otpKey,
        JSON.stringify(record),
        Math.max(1, Math.ceil((record.expiresAt - now) / 1000))
      );
      return error_('OTP_INCORRECT', 'Mã xác minh chưa đúng.', {
        remainingAttempts: remainingAttempts,
      });
    }

    cache.remove(otpKey);
    return {
      ok: true,
      verified: true,
      message: 'Xác minh Gmail thành công.',
    };
  } finally {
    lock.releaseLock();
  }
}

function parseRequest_(event) {
  if (!event || !event.postData || !event.postData.contents) return {};
  var parsed = JSON.parse(event.postData.contents);
  return parsed && typeof parsed === 'object' ? parsed : {};
}

function normalizeEmail_(value) {
  return String(value || '').trim().toLowerCase();
}

function isGmail_(email) {
  return /^[a-z0-9._%+-]+@gmail\.com$/.test(email);
}

function emailKey_(email) {
  return digest_(email).slice(0, 36);
}

function generateOtp_() {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    Utilities.getUuid() + ':' + Date.now(),
    Utilities.Charset.UTF_8
  );
  var value = 0;
  for (var index = 0; index < 6; index += 1) {
    value = (value * 256 + (bytes[index] & 255)) % 1000000;
  }
  return ('000000' + value).slice(-6);
}

function hashOtp_(email, otp) {
  return digest_(email + ':' + otp + ':' + getPepper_());
}

function getPepper_() {
  var properties = PropertiesService.getScriptProperties();
  var pepper = properties.getProperty('OTP_PEPPER');
  if (!pepper) {
    pepper = Utilities.getUuid() + Utilities.getUuid();
    properties.setProperty('OTP_PEPPER', pepper);
  }
  return pepper;
}

function digest_(value) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    value,
    Utilities.Charset.UTF_8
  );
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '');
}

function constantTimeEquals_(left, right) {
  if (left.length !== right.length) return false;
  var difference = 0;
  for (var index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function readJson_(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (reason) {
    return null;
  }
}

function error_(code, message, details) {
  var response = { ok: false, code: code, message: message };
  if (details) {
    Object.keys(details).forEach(function (key) {
      response[key] = details[key];
    });
  }
  return response;
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
