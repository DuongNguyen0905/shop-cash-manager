import { toast } from 'sonner'

export const requirePin = () => {
  const pin = window.prompt('Hành động này cần xác thực. Vui lòng nhập mật khẩu:');
  if (pin === null) return false;
  if (pin.trim() !== 'Tiemgiat201') {
    toast.error('Mật khẩu không đúng!');
    return false;
  }
  return true;
}
