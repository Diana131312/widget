import React, { useState, useCallback } from "react";
import type { WidgetRoom } from "../../../api";
import { Badge } from "../../../components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../../components/ui/accordion";
import { cn } from "../../../lib/utils";
import { getWidgetAssetUrl } from "../../../lib/gettimeAssets";

function truncateDescription(desc: string | null | undefined, maxLen = 72): string {
  if (!desc) return "";
  return desc.length > maxLen ? desc.substring(0, maxLen) + "…" : desc;
}

export type BanyaRoomPickerProps = {
  rooms: WidgetRoom[];
  tenantId: string | null;
  /** Режим «все бани» */
  allRoomsSelected: boolean;
  /** Выбранная баня (при allRoomsSelected игнорируется для заголовка — «Все бани») */
  selectedRoomId?: string;
  /** Показывать плашку «Все бани» (на шаге доп. товаров обычно false) */
  showAllOption: boolean;
  /** Раскрыт аккордион со списком */
  accordionOpen: boolean;
  onAccordionOpenChange: (open: boolean) => void;
  /** Если showAllOption — выбор режима «все бани» */
  onSelectAll?: () => void;
  onSelectRoom: (room: WidgetRoom) => void;
  className?: string;
};

export const BanyaRoomPicker: React.FC<BanyaRoomPickerProps> = ({
  rooms,
  tenantId,
  allRoomsSelected,
  selectedRoomId,
  showAllOption,
  accordionOpen,
  onAccordionOpenChange,
  onSelectAll,
  onSelectRoom,
  className,
}) => {
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());

  const handleImageLoad = useCallback((imagePath: string) => {
    setLoadingImages((prev) => {
      const next = new Set(prev);
      next.delete(imagePath);
      return next;
    });
    setImageErrors((prev) => {
      const next = new Set(prev);
      next.delete(imagePath);
      return next;
    });
  }, []);

  const handleImageError = useCallback((imagePath: string) => {
    setLoadingImages((prev) => {
      const next = new Set(prev);
      next.delete(imagePath);
      return next;
    });
    setImageErrors((prev) => new Set(prev).add(imagePath));
  }, []);

  const handleImageLoadStart = useCallback((imagePath: string) => {
    setLoadingImages((prev) => new Set(prev).add(imagePath));
  }, []);

  const selectedRoom = selectedRoomId ? rooms.find((r) => r.id === selectedRoomId) ?? null : null;

  const titleText = allRoomsSelected
    ? "Все бани"
    : selectedRoom
      ? selectedRoom.name
      : "Все бани";

  const gridClass =
    "grid grid-cols-2 gap-2 sm:gap-2 md:grid-cols-3 lg:grid-cols-4 md:gap-2.5";

  const tileBtn =
    "group flex flex-col overflow-hidden rounded-lg border-2 bg-white text-left shadow-sm transition active:scale-[0.99] hover:border-gray-300 hover:shadow";

  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white shadow-sm", className)}>
      {/* <div className="border-b border-slate-100 px-3 py-3 sm:px-4">
        <h3 className="text-base font-semibold tracking-tight text-[#485548] sm:text-lg">{titleText}</h3>
      
      </div> */}

      <Accordion
        type="single"
        collapsible
        value={accordionOpen ? "rooms" : ""}
        onValueChange={(v) => onAccordionOpenChange(v === "rooms")}
      >
        <AccordionItem value="rooms" className="border-b-0">
          <AccordionTrigger className="px-3 py-2.5 text-sm hover:no-underline sm:px-4">
            {/* <span className="font-medium text-slate-800">Список бань</span> */}
            {/* <span className="ml-2 text-xs font-normal text-slate-500">
              {rooms.length} {rooms.length === 1 ? "позиция" : "позиций"}
            </span> */}

<h3 className="text-base font-semibold tracking-tight text-[#485548] sm:text-lg">{titleText}</h3>
          </AccordionTrigger>
          <AccordionContent className="px-2 pb-3 pt-0 sm:px-3">
            <div className={gridClass}>
              {showAllOption ? (
                <button
                  type="button"
                  className={cn(
                    tileBtn,
                    allRoomsSelected ? "border-[#485548] ring-1 ring-[#485548]/20" : "border-transparent"
                  )}
                  onClick={() => onSelectAll?.()}
                >
                  <div className="flex h-16 shrink-0 items-center justify-center bg-slate-100 text-[11px] font-medium text-slate-500 md:h-[4.5rem]">
                    Все
                  </div>
                  <div className="flex min-h-[3rem] flex-1 flex-col justify-center gap-0.5 p-2">
                    <div className="line-clamp-2 text-xs font-semibold leading-tight text-slate-900">
                      Все бани
                    </div>
                    <div className="text-[10px] leading-tight text-slate-500">Недельная занятость</div>
                  </div>
                </button>
              ) : null}

              {rooms.map((room) => {
                const firstImage = room.images?.[0];
                const imageUrl = getWidgetAssetUrl(firstImage, undefined, { tenantId }) ?? "";
                const hasImageError = imageUrl && imageErrors.has(imageUrl);
                const isImageLoading = imageUrl && loadingImages.has(imageUrl);
                const isSelected = !allRoomsSelected && selectedRoomId === room.id;

                return (
                  <button
                    key={room.id}
                    type="button"
                    className={cn(
                      tileBtn,
                      isSelected ? "border-[#485548] ring-1 ring-[#485548]/20" : "border-transparent"
                    )}
                    onClick={() => onSelectRoom(room)}
                  >
                    <div className="relative h-16 w-full shrink-0 overflow-hidden bg-slate-100 md:h-[4.5rem]">
                      {imageUrl && !hasImageError ? (
                        <>
                          {isImageLoading ? (
                            <div className="absolute inset-0 animate-pulse bg-slate-200" />
                          ) : null}
                          <img
                            src={imageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                            onLoadStart={() => handleImageLoadStart(imageUrl)}
                            onLoad={() => handleImageLoad(imageUrl)}
                            onError={() => handleImageError(imageUrl)}
                            style={{ display: isImageLoading ? "none" : "block" }}
                          />
                        </>
                      ) : (
                        <div className="flex h-full items-center justify-center px-1 text-center text-[10px] text-slate-400">
                          Нет фото
                        </div>
                      )}
                    </div>
                    <div className="flex min-h-[3rem] flex-1 flex-col gap-0.5 p-2">
                      <div className="flex items-start justify-between gap-1">
                        <span className="line-clamp-2 text-left text-xs font-semibold leading-tight text-slate-900">
                          {room.name}
                        </span>
                        {isSelected ? (
                          <Badge className="shrink-0 scale-90 px-1.5 py-0 text-[10px]" variant="default">
                            ✓
                          </Badge>
                        ) : null}
                      </div>
                      {room.description ? (
                        <p className="line-clamp-2 text-[10px] leading-snug text-slate-500">
                          {truncateDescription(room.description, 72)}
                        </p>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
