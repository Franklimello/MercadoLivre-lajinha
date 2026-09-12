"use client";

import { Dialog } from "@base-ui/react/dialog";
import { motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import type { ReactNode, RefObject } from "react";
import { motionTokens } from "@/lib/motion";

const SheetPopup = motion.create(Dialog.Popup);
const SheetBackdrop = motion.create(Dialog.Backdrop);

export function MotionSheet({
  open,
  onOpenChange,
  actionsRef,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionsRef: RefObject<Dialog.Root.Actions | null>;
  children: ReactNode;
}) {
  const reducedMotion = useReducedMotion();
  return (
    <Dialog.Root
      open={open}
      actionsRef={actionsRef}
      onOpenChange={(next, details) => {
        if (!next) details.preventUnmountOnClose();
        onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <SheetBackdrop
          className="fixed inset-0 z-50 bg-black/35"
          initial={{ opacity: 0 }}
          animate={{ opacity: open ? 1 : 0 }}
          transition={{ duration: motionTokens.duration.quick }}
        />
        <SheetPopup
          data-slot="dialog-content"
          className="motion-sheet"
          initial={{ y: reducedMotion ? 0 : "100%", opacity: 0 }}
          animate={{
            y: open || reducedMotion ? 0 : "100%",
            opacity: open ? 1 : 0,
          }}
          transition={
            reducedMotion
              ? { duration: motionTokens.duration.quick }
              : motionTokens.spring.sheet
          }
          onAnimationComplete={() => {
            if (!open) actionsRef.current?.unmount();
          }}
        >
          {children}
          <Dialog.Close
            aria-label="Fechar filtros"
            className="icon-button absolute top-3 right-3"
          >
            <X size={20} aria-hidden="true" />
          </Dialog.Close>
        </SheetPopup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
