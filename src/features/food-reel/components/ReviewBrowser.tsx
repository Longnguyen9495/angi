import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { YoutubeVideo } from '../foodReel.types';
import {
  normalizeProvince,
  persistProvince,
  readProvince,
  reviewDish,
  reviewItems,
  reviewRequest,
  type ProvinceId,
} from '../data/reviews';

export function ReviewBrowser({
  dishId,
  children,
  onReset,
}: {
  dishId: string;
  children: (videos: YoutubeVideo[], province: string) => ReactNode;
  onReset: (selection: null) => void;
}) {
  const dish = reviewDish(dishId);
  const [province, setProvince] = useState<ProvinceId | null>(readProvince);
  const [provinces, setProvinces] = useState<{ id: ProvinceId; name: string }[]>([]);
  // Reviews belong to the request that loaded them: a new dish, province or retry shows
  // "loading" until its own answer arrives, without resetting state inside the effect.
  const [result, setResult] = useState<{ key: string; videos: YoutubeVideo[]; status: string }>({
    key: '',
    videos: [],
    status: '',
  });
  const [geoStatus, setGeoStatus] = useState('');
  const [provinceError, setProvinceError] = useState('');
  const [retry, setRetry] = useState(0);
  const reqKey = dish && province ? `${dish}|${province}|${retry}` : '';
  const videos = result.key === reqKey ? result.videos : [];
  const status = !reqKey ? '' : result.key === reqKey ? result.status : 'Đang tải review…';
  const generation = useRef(0);
  const reverse = useRef<AbortController | null>(null);
  const geoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function cancelGPS() {
    generation.current++;
    reverse.current?.abort();
    reverse.current = null;
    if (geoTimer.current !== null) clearTimeout(geoTimer.current);
    geoTimer.current = null;
  }
  useEffect(() => () => cancelGPS(), []);
  useEffect(() => {
    const controller = new AbortController();
    let live = true;
    reviewRequest('/api/provinces', controller.signal)
      .then((data) => {
        if (!live) return;
        if (!Array.isArray(data?.items)) throw new Error('Danh sách tỉnh không hợp lệ.');
        const items = data.items.filter(
          (item: { id?: unknown; name?: unknown }) =>
            (item?.id === 'HN' || item?.id === 'HCMC') && typeof item.name === 'string',
        );
        if (items.length !== 2 || new Set(items.map((item: { id: string }) => item.id)).size !== 2)
          throw new Error('Danh sách tỉnh không hợp lệ.');
        setProvinces(items);
        setProvinceError('');
      })
      .catch((error: unknown) => {
        if (live) setProvinceError(error instanceof Error ? error.message : 'Không tải được tỉnh.');
      });
    return () => {
      live = false;
      controller.abort();
    };
  }, [retry]);
  useEffect(() => {
    cancelGPS();
    onReset(null);
    if (!dish || !province) return;
    const key = `${dish}|${province}|${retry}`;
    let live = true;
    const controller = new AbortController();
    reviewRequest(`/api/reviews?dish=${dish}&province=${province}`, controller.signal)
      .then((data) => {
        const items = reviewItems(data, dish, province);
        if (!live) return;
        setResult({
          key,
          videos: items,
          status: items.length
            ? `${items.length} review phù hợp metadata.`
            : 'Chưa có review phù hợp metadata cho món và tỉnh này.',
        });
      })
      .catch((error: unknown) => {
        if (live)
          setResult({
            key,
            videos: [],
            status: error instanceof Error ? error.message : 'Không tải được review.',
          });
      });
    return () => {
      live = false;
      controller.abort();
      cancelGPS();
    };
  }, [dish, province, retry, onReset]);
  function locate() {
    cancelGPS();
    if (!window.isSecureContext) {
      setGeoStatus(
        'GPS cần HTTPS hoặc localhost. HTTP angi.local không phải ngữ cảnh an toàn; hãy chọn tỉnh thủ công. Không bỏ qua bảo vệ trình duyệt.',
      );
      return;
    }
    if (!navigator.geolocation) {
      setGeoStatus('Trình duyệt không hỗ trợ GPS. Hãy chọn tỉnh thủ công.');
      return;
    }
    const current = generation.current;
    setGeoStatus('Đang xin vị trí…');
    const fail = (message: string) => {
      if (current !== generation.current) return;
      cancelGPS();
      setGeoStatus(message);
    };
    geoTimer.current = setTimeout(() => fail('GPS quá thời gian. Hãy chọn tỉnh thủ công.'), 15000);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (current !== generation.current) return;
        if (geoTimer.current !== null) clearTimeout(geoTimer.current);
        geoTimer.current = null;
        const { latitude, longitude } = position.coords;
        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude) ||
          Math.abs(latitude) > 90 ||
          Math.abs(longitude) > 180
        ) {
          fail('Vị trí không hợp lệ. Hãy chọn tỉnh thủ công.');
          return;
        }
        const controller = new AbortController();
        reverse.current = controller;
        setGeoStatus('Đang xác định tỉnh…');
        reviewRequest('/api/reverse', controller.signal, { latitude, longitude })
          .then((data) => {
            if (current !== generation.current) return;
            const id = normalizeProvince(data?.provinceId);
            if (!id) throw new Error('Vị trí ngoài hai tỉnh thử nghiệm. Hãy chọn tỉnh thủ công.');
            cancelGPS();
            persistProvince(id);
            setProvince(id);
            setGeoStatus(`Đã chọn ${id === 'HN' ? 'Hà Nội' : 'Hồ Chí Minh'}.`);
          })
          .catch((error: unknown) =>
            fail(error instanceof Error ? error.message : 'Không xác định được tỉnh.'),
          );
      },
      (error) =>
        fail(
          error.code === 1
            ? 'Bạn đã từ chối quyền vị trí. Hãy chọn tỉnh thủ công.'
            : error.code === 3
              ? 'GPS quá thời gian. Hãy chọn tỉnh thủ công.'
              : 'Không lấy được vị trí. Hãy chọn tỉnh thủ công.',
        ),
      { timeout: 10000, maximumAge: 0, enableHighAccuracy: false },
    );
  }
  return (
    <section className="fr-youtube" aria-label="Review quán ăn theo tỉnh">
      <h3>Review quán ăn theo tỉnh</h3>
      <p>
        Thử nghiệm Hà Nội và Hồ Chí Minh, chỉ cơm tấm và phở bò; tối đa 5 video, không đảm bảo đủ 5.
      </p>
      <p>
        Chọn dựa trên tiêu đề và mô tả (title-description-only), không xác minh hình/âm thanh và
        không tuyên bố AI đã xem video. Không thay bằng video công thức.
      </p>
      <label>
        Tỉnh/thành{' '}
        <select
          aria-label="Tỉnh/thành"
          value={province ?? ''}
          onChange={(event) => {
            cancelGPS();
            setGeoStatus('');
            const id = normalizeProvince(event.target.value);
            setProvince(id);
            if (id) persistProvince(id);
          }}
        >
          <option value="" disabled>
            Chọn tỉnh
          </option>
          {provinces.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <p>
        Chỉ lưu mã tỉnh trên thiết bị, không lưu GPS. Khi bấm dùng vị trí, tọa độ được gửi qua
        backend tới Nominatim để xác định tỉnh; ứng dụng không lưu tọa độ, không cam kết việc
        lưu/log của nhà cung cấp.
      </p>
      <button type="button" onClick={locate}>
        Dùng vị trí của tôi
      </button>
      <button
        type="button"
        onClick={() => {
          cancelGPS();
          setProvinceError('');
          setRetry((value) => value + 1);
        }}
      >
        Thử tải lại
      </button>
      {provinceError && <p role="alert">{provinceError}</p>}
      <p role="status">{geoStatus}</p>
      {!dish ? (
        <p role="status">Món này chưa thuộc pilot review. Không dùng video công thức dự phòng.</p>
      ) : (
        <p role="status">{status || 'Chọn tỉnh để xem review.'}</p>
      )}
      {children(videos, province ?? '')}
    </section>
  );
}
