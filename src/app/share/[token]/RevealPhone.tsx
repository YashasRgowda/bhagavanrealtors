"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";
import { formatPhoneIN } from "@/lib/format/phone";

/**
 * Basic anti-scrape guard: phone stays hidden until the viewer taps.
 * After reveal, becomes a tap-to-call link.
 */
export function RevealPhone({ phone, big }: { phone: string; big?: boolean }) {
  const [revealed, setRevealed] = useState(false);
  if (!revealed) {
    return (
      <Button
        onClick={() => setRevealed(true)}
        size={big ? "lg" : "sm"}
        variant={big ? "default" : "outline"}
      >
        <Phone className="h-4 w-4" /> Show phone number
      </Button>
    );
  }
  const digits = phone.replace(/\D/g, "");
  return (
    <a href={`tel:${digits}`}>
      <Button size={big ? "lg" : "sm"} variant={big ? "default" : "outline"}>
        <Phone className="h-4 w-4" /> {formatPhoneIN(phone)}
      </Button>
    </a>
  );
}
