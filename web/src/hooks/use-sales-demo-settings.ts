"use client";

import { useCallback, useEffect, useState } from "react";

import {
  DEFAULT_SALES_DEMO_SETTINGS,
  isDemoSettingsCompetitor,
  patchSalesDemoSettings,
  readSalesDemoSettings,
  SALES_DEMO_SETTINGS_CHANGED_EVENT,
  type SalesDemoSettings,
  writeSalesDemoSettings,
} from "@/lib/demo/sales-demo-settings";

export function useSalesDemoSettings(competitorDomain: string) {
  const domain = competitorDomain.trim().toLowerCase();
  const enabled = isDemoSettingsCompetitor(domain);

  const [settings, setSettings] = useState<SalesDemoSettings>(() => readSalesDemoSettings());

  useEffect(() => {
    if (!enabled) return;
    setSettings(readSalesDemoSettings());
    const onChange = () => setSettings(readSalesDemoSettings());
    window.addEventListener(SALES_DEMO_SETTINGS_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(SALES_DEMO_SETTINGS_CHANGED_EVENT, onChange);
  }, [enabled]);

  const updateSettings = useCallback((patch: Partial<SalesDemoSettings>) => {
    const next = patchSalesDemoSettings(patch);
    setSettings(next);
  }, []);

  const resetSettings = useCallback(() => {
    writeSalesDemoSettings({ ...DEFAULT_SALES_DEMO_SETTINGS });
    setSettings({ ...DEFAULT_SALES_DEMO_SETTINGS });
  }, []);

  return {
    enabled,
    settings: enabled ? settings : null,
    updateSettings,
    resetSettings,
  };
}
