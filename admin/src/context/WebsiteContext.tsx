import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { publicApi, type WebsiteBundle } from "../lib/api";

type WebsiteContextValue = {
  data: WebsiteBundle | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

const WebsiteContext = createContext<WebsiteContextValue | null>(null);

const empty: WebsiteBundle = {
  settings: {
    id: "clinic",
    clinicName: "Aurelia Dental",
    phone: null,
    email: null,
    address: null,
  },
  services: [],
  doctors: [],
  gallery: [],
  testimonials: [],
  insurance: [],
  memberships: [],
  faqs: [],
  paymentOptions: { methods: [] },
};

export function WebsiteProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<WebsiteBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    setError(null);
    try {
      const bundle = await publicApi.website();
      setData(bundle);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load website");
      setData((prev) => prev || empty);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const value = useMemo(
    () => ({ data, loading, error, reload }),
    [data, loading, error],
  );

  return (
    <WebsiteContext.Provider value={value}>{children}</WebsiteContext.Provider>
  );
}

export function useWebsite() {
  const ctx = useContext(WebsiteContext);
  if (!ctx) throw new Error("useWebsite must be used within WebsiteProvider");
  return ctx;
}
