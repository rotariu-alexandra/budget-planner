import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type Currency = "RON" | "EUR" | "USD";
type Theme = "light" | "dark";

type Preferences = {
  currency: Currency;
  theme: Theme;
  setCurrency: (c: Currency) => void;
  toggleTheme: () => void;
};

const PreferencesContext = createContext<Preferences | null>(null);

const LS_CURRENCY = "bp_currency";
const LS_THEME = "bp_theme";

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>("RON");
  const [theme, setTheme] = useState<Theme>("light");

  // localStorage
  useEffect(() => {
    try {
      const c = localStorage.getItem(LS_CURRENCY) as Currency | null;
      const t = localStorage.getItem(LS_THEME) as Theme | null;

      if (c === "RON" || c === "EUR" || c === "USD") setCurrencyState(c);
      if (t === "light" || t === "dark") setTheme(t);
    } catch {}
  }, []);

  
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");

    try {
      localStorage.setItem(LS_THEME, theme);
    } catch {}
  }, [theme]);

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    try {
      localStorage.setItem(LS_CURRENCY, c);
    } catch {}
  };

  const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  const value = useMemo(
    () => ({ currency, theme, setCurrency, toggleTheme }),
    [currency, theme]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used within PreferencesProvider");
  return ctx;
}


export function formatMoney(amount: number, currency: Currency) {
  const symbols: Record<Currency, string> = { RON: "RON", EUR: "€", USD: "$" };
  const symbol = symbols[currency];


  if (currency === "RON") return `${amount.toFixed(2)} ${symbol}`;
  return `${symbol}${amount.toFixed(2)}`;
}
