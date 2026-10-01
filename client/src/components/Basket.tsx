import { LuExternalLink, LuShoppingBag, LuTrash2 } from "react-icons/lu";
import { PiCoatHanger } from "react-icons/pi";
import { checkoutUrl, removeFromBasket, setBasketOpen, useBasket, useBasketOpen } from "../lib/basket";
import { formatMoney } from "../lib/format";
import { btn } from "../lib/ui";
import SideDrawer, { HeaderButton } from "./SideDrawer";

// Header button that opens the basket drawer.
export function BasketButton() {
  return <HeaderButton icon={<LuShoppingBag />} label="Basket" count={useBasket().length} onClick={() => setBasketOpen(true)} />;
}

// Slide-in basket on the right. Each item checks out on the Sharetribe
// marketplace, where buyers log in and pay with Stripe.
export function BasketDrawer() {
  const open = useBasketOpen();
  const items = useBasket();

  if (!open) return null;

  const priced = items.filter((item) => item.price);
  const subtotal = priced.reduce((sum, item) => sum + item.price!.amount, 0);
  const currency = priced[0]?.price?.currency;

  return (
    <SideDrawer
      label="Basket"
      title={<>Basket {items.length > 0 && <span className="text-ink-3">({items.length})</span>}</>}
      onClose={() => setBasketOpen(false)}
    >
      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center text-ink-2">
          <LuShoppingBag className="size-10 text-ink-3" />
          <p className="font-semibold text-ink">Your basket is empty</p>
          <p className="text-sm">Open an item and choose "Add to basket" to keep it here.</p>
        </div>
      ) : (
        <>
          <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
            {items.map((item) => (
              <li key={item.id} className="flex gap-3.5 py-4">
                <div className="size-20 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                  {item.images[0] ? (
                    <img src={item.images[0].url} alt="" className="size-full object-cover" />
                  ) : (
                    <div className="grid size-full place-items-center text-ink-3">
                      <PiCoatHanger className="size-7" />
                    </div>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="line-clamp-2 text-sm leading-snug font-semibold">{item.title}</p>
                  <p className="text-[15px] font-bold">{item.price ? formatMoney(item.price) : "Open to offers"}</p>
                  <div className="mt-auto flex items-center gap-3 text-sm">
                    <a
                      href={checkoutUrl(item)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-accent no-underline hover:underline"
                    >
                      Checkout <LuExternalLink className="size-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => removeFromBasket(item.id)}
                      className="inline-flex items-center gap-1 text-ink-3 hover:text-warm"
                    >
                      <LuTrash2 className="size-3.5" /> Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <footer className="border-t border-line px-5 py-4">
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-ink-2">Subtotal</span>
              <span className="text-lg font-bold">{formatMoney({ amount: subtotal, currency })}</span>
            </div>
            <p className="mb-4 text-xs text-ink-3">
              Shipping is added at checkout. Each item is bought separately from its seller on our Sharetribe
              marketplace, where you log in and pay securely.
            </p>
            <a
              href={checkoutUrl(items[0])}
              target="_blank"
              rel="noreferrer"
              className={`${btn.primary} w-full no-underline`}
            >
              Checkout first item <LuExternalLink className="size-4" />
            </a>
          </footer>
        </>
      )}
    </SideDrawer>
  );
}
