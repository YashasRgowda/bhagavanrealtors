"use client";

import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

/**
 * Opens WhatsApp with a prefilled "I'm interested in ..." message to the agent's number.
 */
export function WhatsappShare({ phone, propertyTitle }: { phone: string; propertyTitle: string }) {
  // Assume Indian number; strip non-digits, prepend 91 if only 10 digits.
  const digits = phone.replace(/\D/g, "");
  const withCountry = digits.length === 10 ? `91${digits}` : digits;
  const msg = `Hi, I'm interested in this property: ${propertyTitle}. Can you share more details?`;
  const href = `https://wa.me/${withCountry}?text=${encodeURIComponent(msg)}`;
  return (
    <a href={href} target="_blank" rel="noreferrer">
      <Button size="lg" variant="outline">
        <MessageCircle className="h-4 w-4" /> WhatsApp agent
      </Button>
    </a>
  );
}
