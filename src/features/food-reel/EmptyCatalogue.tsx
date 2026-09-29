/** Shown when the database answers but has no publishable dish yet. */
export function EmptyCatalogue() {
  return (
    <main className="fr-empty">
      <p className="fr-empty__brand">Bếp Việt</p>
      <h1 className="fr-empty__title">Chưa có món nào</h1>
      <p className="fr-empty__text">
        Thực đơn đang trống. Vào trang quản trị, tải ảnh món ăn lên — AI sẽ nhận diện và điền thông
        tin giúp bạn.
      </p>
      <a className="fr-empty__cta" href="/admin/#/dishes/new">
        Thêm món đầu tiên
      </a>
    </main>
  );
}
