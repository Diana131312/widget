import React, { useMemo, useState } from "react";
import type { WidgetProduct } from "../../../api";
import { resolveBookingImageUrl } from "../media/imageCache";
import type { GroupWithProducts } from "./groupProducts";

const ALL_ID = "__all__";

type ProductCardProps = {
  product: WidgetProduct;
  quantity: number;
  onSetQuantity: (productId: string, next: number) => void;
  tenantId: string | null;
};

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  quantity,
  onSetQuantity,
  tenantId,
}) => {
  const img = resolveBookingImageUrl(product.image, tenantId, 400);
  const selected = quantity > 0;

  return (
    <article
      className={[
        "booking-product-card",
        selected ? "booking-product-card--selected" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="booking-product-card__media">
        {img ? (
          <img
            className="booking-product-card__img"
            src={img}
            alt=""
            loading="lazy"
          />
        ) : (
          <div className="booking-product-card__placeholder">
            <span>на фотосессии</span>
          </div>
        )}
      </div>

      <div className="booking-product-card__meta">
        <p className="booking-product-card__name">{product.name}</p>
        <p className="booking-product-card__price">
          {product.price.toLocaleString("ru-RU")} ₽
        </p>
      </div>

      {selected ? (
        <div className="booking-product-card__qty booking-qty">
          <button
            type="button"
            className="booking-qty__btn"
            onClick={() => onSetQuantity(product.id, quantity - 1)}
            aria-label={`Убрать ${product.name}`}
          >
            −
          </button>
          <span className="booking-qty__value" aria-live="polite">
            {quantity}
          </span>
          <button
            type="button"
            className="booking-qty__btn"
            onClick={() => onSetQuantity(product.id, quantity + 1)}
            aria-label={`Добавить ещё ${product.name}`}
          >
            +
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="booking-product-card__add"
          onClick={() => onSetQuantity(product.id, 1)}
          aria-label={`Добавить ${product.name}`}
        >
          Добавить
        </button>
      )}
    </article>
  );
};

type ProductCatalogProps = {
  groups: GroupWithProducts[];
  quantities: Record<string, number>;
  onSetQuantity: (productId: string, next: number) => void;
  tenantId: string | null;
};

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  groups,
  quantities,
  onSetQuantity,
  tenantId,
}) => {
  const [activeGroupId, setActiveGroupId] = useState(ALL_ID);

  const tabs = useMemo(
    () => [
      { id: ALL_ID, label: "Все" },
      ...groups.map(({ group }) => ({ id: group.id, label: group.name })),
    ],
    [groups]
  );

  const visibleProducts = useMemo(() => {
    if (activeGroupId === ALL_ID) {
      return groups.flatMap((g) => g.products);
    }
    return groups.find((g) => g.group.id === activeGroupId)?.products ?? [];
  }, [groups, activeGroupId]);

  if (groups.length === 0) {
    return (
      <p className="booking-setup__empty">
        Нет доступных дополнительных товаров в каталоге.
      </p>
    );
  }

  return (
    <div className="booking-product-catalog" aria-label="Дополнительные товары">
      <div className="booking-product-tabs-bar">
        <div
          className="booking-product-tabs"
          role="tablist"
          aria-label="Категории товаров"
        >
          {tabs.map((tab) => {
            const selected = tab.id === activeGroupId;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                className={[
                  "booking-product-tabs__tab",
                  selected ? "booking-product-tabs__tab--active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setActiveGroupId(tab.id)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {visibleProducts.length === 0 ? (
        <p className="booking-setup__empty">В этой категории пока нет товаров.</p>
      ) : (
        <div className="booking-product-grid">
          {visibleProducts.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              quantity={quantities[p.id] ?? 0}
              onSetQuantity={onSetQuantity}
              tenantId={tenantId}
            />
          ))}
        </div>
      )}
    </div>
  );
};
