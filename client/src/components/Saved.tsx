import { LuHeart, LuShoppingBag } from "react-icons/lu";
import { PiCoatHanger } from "react-icons/pi";
import { useNavigate, useSearchParams } from "react-router";
import { addToBasket, useBasket } from "../lib/basket";
import { setSavedOpen, toggleFavorite, useFavorites, useSavedOpen } from "../lib/favorites";
import { formatMoney, isWanted } from "../lib/format";
import { browseUrl } from "../lib/search";
import SideDrawer, { HeaderButton } from "./SideDrawer";

// Header button that opens the saved-items drawer.
export function SavedButton() {
  const count = Object.keys(useFavorites()).length;
  return <HeaderButton icon={<LuHeart />} label="Saved" count={count} onClick={() => setSavedOpen(true)} />;
}

// Slide-in list of favourited items; picking one opens its details popup.
export function SavedDrawer() {
  const open = useSavedOpen();
  const saved = Object.values(useFavorites());
  const basketIds = new Set(useBasket().map((item) => item.id));
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  if (!open) return null;

  const openItem = (id: string) => {
    setSavedOpen(false);
    navigate(browseUrl(searchParams, { item: id }), { preventScrollReset: true, state: { openedItem: true } });
  };

  return (
    <SideDrawer
      label="Saved items"
      title={<>Saved {saved.length > 0 && <span className="text-ink-3">({saved.length})</span>}</>}
      onClose={() => setSavedOpen(false)}
    >
      {saved.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center text-ink-2">
          <LuHeart className="size-10 text-ink-3" />
          <p className="font-semibold text-ink">Nothing saved yet</p>
          <p className="text-sm">Tap the heart on any item to keep it here for later.</p>
        </div>
      ) : (
        <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
          {saved.map((item) => (
            <li key={item.id} className="flex gap-3.5 py-4">
              <button
                type="button"
                onClick={() => openItem(item.id)}
                aria-label={`Open ${item.title}`}
                className="size-20 shrink-0 overflow-hidden rounded-xl bg-surface-2"
              >
                {item.images[0] ? (
                  <img src={item.images[0].url} alt="" className="size-full object-cover" />
                ) : (
                  <span className="grid size-full place-items-center text-ink-3">
                    <PiCoatHanger className="size-7" />
                  </span>
                )}
              </button>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <button
                  type="button"
                  onClick={() => openItem(item.id)}
                  className="line-clamp-2 text-left text-sm leading-snug font-semibold hover:text-accent"
                >
                  {item.title}
                </button>
                <p className="text-[15px] font-bold">
                  {isWanted(item) ? "Wanted" : item.price ? formatMoney(item.price) : "Open to offers"}
                </p>
                <div className="mt-auto flex items-center gap-3 text-sm">
                  {!isWanted(item) &&
                    (basketIds.has(item.id) ? (
                      <span className="text-ink-3">In basket</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => addToBasket(item)}
                        className="inline-flex items-center gap-1 font-semibold text-accent hover:underline"
                      >
                        <LuShoppingBag className="size-3.5" /> Add to basket
                      </button>
                    ))}
                  <button
                    type="button"
                    onClick={() => toggleFavorite(item)}
                    className="inline-flex items-center gap-1 text-ink-3 hover:text-warm"
                  >
                    <LuHeart className="size-3.5 fill-current" /> Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SideDrawer>
  );
}
