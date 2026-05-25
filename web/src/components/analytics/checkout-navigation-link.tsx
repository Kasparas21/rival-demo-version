"use client";

import Link from "next/link";
import type { ComponentProps, MouseEvent, ReactNode } from "react";

import { beginCheckoutNavigation } from "@/lib/analytics/meta-pixel-client";
import { isCheckoutNavigationHref } from "@/lib/analytics/meta-pixel";

type CheckoutNavigationLinkProps = Omit<ComponentProps<typeof Link>, "href" | "onClick"> & {
  href: string;
  children: ReactNode;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

/** Link that fires Meta InitiateCheckout before checkout / upgrade navigation. */
export function CheckoutNavigationLink({
  href,
  children,
  onClick,
  ...rest
}: CheckoutNavigationLinkProps) {
  if (!isCheckoutNavigationHref(href)) {
    return (
      <Link href={href} onClick={onClick} {...rest}>
        {children}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      {...rest}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        event.preventDefault();
        beginCheckoutNavigation(href);
      }}
    >
      {children}
    </Link>
  );
}

type CheckoutNavigationAnchorProps = ComponentProps<"a"> & {
  href: string;
};

/** Plain anchor variant for settings-style markup. */
export function CheckoutNavigationAnchor({
  href,
  onClick,
  children,
  ...rest
}: CheckoutNavigationAnchorProps) {
  if (!isCheckoutNavigationHref(href)) {
    return (
      <a href={href} onClick={onClick} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <a
      href={href}
      {...rest}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        event.preventDefault();
        beginCheckoutNavigation(href);
      }}
    >
      {children}
    </a>
  );
}
