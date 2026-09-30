import { ArrowUpRight, Trash } from '@phosphor-icons/react';
import { Sheet } from '../../../components/ui/Sheet';
import { formatReelPrice, getReelDish, reelCount, REGION_LABEL } from '../data/reelCatalogue';

export function SavedPanel({
  open,
  onClose,
  saved,
  onOpenDish,
  onRemove,
}: {
  open: boolean;
  onClose: () => void;
  saved: string[];
  onOpenDish: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const dishes = saved.map((id) => getReelDish(id)).filter((d) => !!d);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Món đã lưu"
      description="Lưu trên thiết bị này, không cần tài khoản."
      variant="dark"
    >
      {dishes.length === 0 ? (
        <p className="fr-panel-note">
          Chưa có món nào. Mở câu chuyện một món và nhấn “Lưu món” để giữ lại ở đây.
        </p>
      ) : (
        <ul className="fr-saved">
          {dishes.map((d) => (
            <li key={d.id} className="fr-saved__item">
              <img src={d.thumbnail} alt="" width={64} height={64} className="fr-saved__img" />
              <span className="fr-saved__text">
                <span className="fr-saved__name">{d.name}</span>
                <span className="fr-saved__meta">
                  {REGION_LABEL[d.region]} · {formatReelPrice(d.price)}
                </span>
              </span>
              <button
                type="button"
                className="fr-ghost fr-ghost--sm"
                onClick={() => onOpenDish(d.id)}
                aria-label={`Xem câu chuyện ${d.name}`}
              >
                <ArrowUpRight aria-hidden="true" size={16} />
              </button>
              <button
                type="button"
                className="fr-ghost fr-ghost--sm"
                onClick={() => onRemove(d.id)}
                aria-label={`Bỏ lưu ${d.name}`}
              >
                <Trash aria-hidden="true" size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}

export function AboutPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Về dự án" variant="dark">
      <div className="fr-about">
        <p>
          <strong>Bếp Việt · Food Reel</strong> là một trải nghiệm chọn món bằng chuyển động: quay
          reel, để {reelCount()} món lướt qua, rồi dừng lại ở một món để đọc câu chuyện của nó.
        </p>
        <p>
          Kết quả quay được quyết định trước khi reel chuyển động; hiệu ứng chỉ trình diễn quãng
          đường đến món đó. Không có đăng nhập, không có quảng cáo hay thanh toán.
        </p>
        <p>
          Sau khi chốt món, phần <em>Hành trình</em> mở ra: hạt giống, khu vườn, bản đồ ẩm thực và
          check-in sau bữa. Tiến trình lưu trên thiết bị của bạn; muốn giữ khi đổi máy thì lưu bằng
          email trong Hồ sơ (không bắt buộc).
        </p>
        <p>
          <a href="/quyen-rieng-tu.html" target="_blank" rel="noopener">
            Quyền riêng tư — Bếp Việt lưu gì và cách xoá
          </a>
        </p>
        <p className="fr-panel-note">
          Ảnh món: bộ ảnh food reel lấy từ kho truanayangi (xem ghi chú trong từng câu chuyện). Giá
          chỉ mang tính tham khảo; thông tin thành phần không thay thế tư vấn dị ứng. Video câu
          chuyện món đang được bổ sung dần — món chưa có video hiển thị poster.
        </p>
      </div>
    </Sheet>
  );
}

export function BootScreen({ progress }: { progress: number }) {
  return (
    <div className="fr-boot" role="status" aria-live="polite">
      <span className="fr-logo__mark fr-boot__mark" aria-hidden="true" />
      <p className="fr-boot__text">Đang bày món…</p>
      <span className="fr-boot__bar" aria-hidden="true">
        <span
          className="fr-boot__fill"
          style={{ transform: `scaleX(${Math.max(0.05, progress)})` }}
        />
      </span>
    </div>
  );
}
