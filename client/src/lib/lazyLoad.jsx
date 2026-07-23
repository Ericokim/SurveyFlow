import { lazy, Suspense } from "react";
import { ScreenLoader } from "@/components/shared/Loading";

const FallbackSpinner = () => <ScreenLoader message="Loading..." />;

/**
 * lazyLoad - wraps React.lazy with Suspense and a minimal spinner
 * usage: const SettingsPage = lazyLoad(() => import("..."));
 */
export const lazyLoad = (fn) => {
  const LazyComponent = lazy(fn);
  return (props) => (
    <Suspense fallback={<FallbackSpinner />}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

export { FallbackSpinner };
