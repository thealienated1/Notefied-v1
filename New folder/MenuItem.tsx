import remixiconUrl from 'remixicon/fonts/remixicon.symbol.svg';

export default function MenuItem({
  icon,
  title,
  action,
  isActive = null,
}: {
  icon?: string;
  title?: string;
  action?: () => void;
  isActive?: (() => boolean) | null;
}) {
  return (
    <button
      className={`bg-transparent border-0 rounded-[0.4rem] text-white cursor-pointer h-7 p-1 w-7 mx-1 hover:bg-[#303030] ${
        isActive?.() ? 'bg-[#303030]' : ''
      }`}
      onClick={action}
      title={title}
    >
      <svg className="remix fill-current h-full w-full">
        <use xlinkHref={`${remixiconUrl}#ri-${icon}`} />
      </svg>
    </button>
  );
}