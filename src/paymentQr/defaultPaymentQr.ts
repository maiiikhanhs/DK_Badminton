import placeholderImage from '../assets/payment-qr-placeholder.svg'

// Keep the local QR out of Git while allowing clean clones to build without it.
const localImages = import.meta.glob<string>('../assets/payment-qr.jpg', {
  eager: true,
  query: '?url',
  import: 'default',
})

export const defaultPaymentQrImage = localImages['../assets/payment-qr.jpg'] ?? placeholderImage
