import { cn } from "../../lib/utils";

const breakpointVisibility = {
  md: {
    mobile: "md:hidden",
    desktop: "hidden md:block",
  },
  lg: {
    mobile: "lg:hidden",
    desktop: "hidden lg:block",
  },
};

function DefaultStateContainer({ children }) {
  return <div className="bg-white rounded-2xl shadow-sm p-8">{children}</div>;
}

function DefaultLoadingView() {
  return (
    <DefaultStateContainer>
      <div className="animate-pulse space-y-3">
        <div className="h-8 w-1/2 rounded bg-gray-200" />
        <div className="h-8 w-full rounded bg-gray-200" />
        <div className="h-8 w-3/4 rounded bg-gray-200" />
      </div>
    </DefaultStateContainer>
  );
}

function DefaultEmptyView({ emptyMessage }) {
  return (
    <DefaultStateContainer>
      <div className="text-center text-[#64748B]">{emptyMessage}</div>
    </DefaultStateContainer>
  );
}

export default function ResponsiveDataList({
  items,
  loading,
  getItemKey,
  renderDesktop,
  renderMobileItem,
  mobileBreakpoint = "md",
  emptyMessage = "No hay registros para mostrar",
  loadingView,
  emptyView,
  mobileListClassName,
  desktopClassName,
}) {
  const visibility = breakpointVisibility[mobileBreakpoint] || breakpointVisibility.md;

  if (loading) {
    return loadingView || <DefaultLoadingView />;
  }

  if (!items.length) {
    return emptyView || <DefaultEmptyView emptyMessage={emptyMessage} />;
  }

  return (
    <>
      <div className={cn(visibility.mobile, mobileListClassName)}>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={getItemKey(item)}>{renderMobileItem(item)}</div>
          ))}
        </div>
      </div>

      <div className={cn(visibility.desktop, desktopClassName)}>{renderDesktop()}</div>
    </>
  );
}