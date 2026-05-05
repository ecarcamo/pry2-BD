type IconProps = { size?: number; className?: string }

const icon = (d: string) =>
  function Icon({ size = 18, className }: IconProps) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={2} strokeLinecap="round"
        strokeLinejoin="round" className={className}>
        <path d={d} />
      </svg>
    )
  }

export const HomeIcon = icon('M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10')
export const NetworkIcon = icon('M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75')
export const BriefcaseIcon = icon('M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2')
export const BuildingIcon = icon('M3 21h18 M3 7v14 M21 7v14 M8 21V11l4-4 4 4v10 M9 21v-4h6v4')
export const UserIcon = icon('M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8')
export const CheckIcon = icon('M20 6L9 17l-5-5')
export const CodeIcon = icon('M16 18l6-6-6-6 M8 6l-6 6 6 6')
export const GraphIcon = icon('M17 12a5 5 0 1 0-10 0 5 5 0 0 0 10 0z M12 7V2 M12 22v-5 M7 12H2 M22 12h-5 M16.95 7.05l3.54-3.54 M3.51 20.49l3.54-3.54 M16.95 16.95l3.54 3.54 M3.51 3.51l3.54 3.54')
export const SearchIcon = icon('M11 17.25a6.25 6.25 0 1 1 0-12.5 6.25 6.25 0 0 1 0 12.5z M16 16l3.5 3.5')
export const PlusIcon = icon('M12 5v14 M5 12h14')
export const HeartIcon = icon('M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z')
export const MessageIcon = icon('M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z')
export const ShareIcon = icon('M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8 M16 6l-4-4-4 4 M12 2v13')
export const TrashIcon = icon('M3 6h18 M19 6l-1 14H6L5 6 M8 6V4h8v2')
export const EditIcon = icon('M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z')
export const XIcon = icon('M18 6L6 18 M6 6l12 12')
export const RefreshIcon = icon('M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0 1 14.85-3.36L23 10 M1 14l4.64 4.36A9 9 0 0 0 20.49 15')
export const BarChartIcon = icon('M12 20V10 M18 20V4 M6 20v-4')
export const ZapIcon = icon('M13 2L3 14h9l-1 8 10-12h-9l1-8z')
export const GlobeIcon = icon('M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z M2 12h20 M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z')
export const ActivityIcon = icon('M22 12h-4l-3 9L9 3l-3 9H2')
export const AwardIcon = icon('M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M8.21 13.89L7 23l5-3 5 3-1.21-9.12')
export const RouteIcon = icon('M3 11l19-9-9 19-2-8-8-2z')
