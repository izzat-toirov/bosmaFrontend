import { Component, useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { apiGet } from '../../lib/api-client';
import type { Order } from '../../types/api';

class OrdersErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }, context: any) {
    super(props, context);
  }

  state: { hasError: boolean } = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(err: any) {
    toast.error(err?.message || 'Orders page crashed');
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/75 backdrop-blur-md">
          Something went wrong loading your orders.
        </div>
      );
    }

    return this.props.children;
  }
}

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function StatusBadge({ status }: { status: Order['status'] }) {
  const cls = useMemo(() => {
    switch (status) {
      case 'DELIVERED':
        return 'bg-emerald-500/15 text-emerald-200 border-emerald-400/20';
      case 'SHIPPED':
        return 'bg-sky-500/15 text-sky-200 border-sky-400/20';
      case 'PROCESSING':
        return 'bg-amber-500/15 text-amber-200 border-amber-400/20';
      case 'PAID':
        return 'bg-indigo-500/15 text-indigo-200 border-indigo-400/20';
      case 'CANCELLED':
        return 'bg-rose-500/15 text-rose-200 border-rose-400/20';
      case 'PENDING':
      default:
        return 'bg-white/10 text-white/80 border-white/10';
    }
  }, [status]);

  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold',
        cls,
      ].join(' ')}
    >
      {status}
    </span>
  );
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiGet<any>('/orders');
        if (cancelled) return;
        const list: Order[] = Array.isArray(res)
          ? res
          : Array.isArray(res?.data)
            ? res.data
            : [];
        setOrders(list);
      } catch (e: any) {
        if (cancelled) return;
        const msg = e?.message || 'Failed to load orders';
        setError(msg);
        toast.error(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <OrdersErrorBoundary>
      <div className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
          <div className="text-lg font-extrabold tracking-tight">My Orders</div>
          <div className="mt-1 text-sm text-white/65">Track your recent purchases and designs.</div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/75 backdrop-blur-md">
            Loading orders…
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/75 backdrop-blur-md">
            {error}
          </div>
        ) : (orders ?? []).length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/75 backdrop-blur-md">
            No orders found.
          </div>
        ) : (
          <div className="space-y-3">
            {(orders ?? [])
              .slice()
              .sort((a, b) => ((a?.createdAt ?? '') < (b?.createdAt ?? '') ? 1 : -1))
              .map((order) => {
                const orderId = order?.id;
                if (orderId == null) return null;

                const isOpen = expandedId === orderId;
                const total = typeof order?.totalPrice === 'number' ? order.totalPrice : 0;

                return (
                  <div
                    key={orderId}
                    className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-[0_16px_50px_rgba(0,0,0,0.3)]"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedId((prev) => (prev === orderId ? null : orderId))}
                      className="w-full text-left px-5 py-4"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="text-sm text-white/60">Order #{orderId}</div>
                          <div className="text-sm font-semibold text-white/85">
                            {formatDate(order?.createdAt ?? '')}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <StatusBadge status={order?.status ?? 'PENDING'} />
                          <div className="text-sm font-extrabold text-white/90">
                            {total.toLocaleString()} UZS
                          </div>
                        </div>
                      </div>
                    </button>

                    {isOpen ? (
                      <div className="border-t border-white/10 px-5 py-4">
                        <div className="text-sm font-bold text-white/85">Items</div>

                        <div className="mt-3 grid grid-cols-1 gap-3">
                          {(order?.items ?? []).length === 0 ? (
                            <div className="text-sm text-white/60">No items</div>
                          ) : (
                            (order?.items ?? []).map((item) => {
                              const itemId = item?.id;
                              if (itemId == null) return null;

                              const productName =
                                item?.variant?.product?.name ??
                                `Product #${item?.variant?.productId ?? item?.variantId ?? ''}`;

                              const itemPrice = typeof item?.price === 'number' ? item.price : 0;

                              return (
                                <div
                                  key={itemId}
                                  className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-3"
                                >
                                  <div className="h-16 w-16 overflow-hidden rounded-lg border border-white/10 bg-black/20">
                                    {item?.frontPreviewUrl ? (
                                      <img
                                        src={item.frontPreviewUrl}
                                        alt={productName}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center text-xs text-white/50">
                                        No preview
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex-1">
                                    <div className="text-sm font-semibold text-white/90">
                                      {productName}
                                    </div>
                                    <div className="mt-0.5 text-xs text-white/60">
                                      Qty: {item?.quantity ?? 0} • {itemPrice.toLocaleString()} UZS
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </OrdersErrorBoundary>
  );
}
