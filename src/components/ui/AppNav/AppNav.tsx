import { cn } from "@/lib/cn";
import styles from "./AppNav.module.css";

export interface NavItem {
  href: string;
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
}

export interface AppNavProps {
  items: NavItem[];
  onLogout: () => void;
  logoutLabel?: string;
  brand?: string;
}

/**
 * BottomTabBar (mobile) / TopNav (desktop) — UX-SPEC.md Seção 3.2 e 6.2.
 * Uma única fonte de navegação da área interna, com duas apresentações
 * responsivas alternadas via CSS (nunca ambas visíveis ao mesmo tempo —
 * `display:none` também remove da árvore de acessibilidade, então não há
 * landmark duplicado exposto simultaneamente a leitor de tela).
 *
 * Usa `<a href>` simples (não `next/link`) para manter o componente
 * agnóstico de roteador dentro do design system; a tela que consome
 * (FE-01…FE-12) pode envolver com `next/link` se quiser prefetch — decisão
 * de implementação, documentada, não lacuna silenciosa.
 */
export function AppNav({ items, onLogout, logoutLabel = "Sair", brand }: AppNavProps) {
  return (
    <>
      <BottomTabBar items={items} />
      <TopNav items={items} onLogout={onLogout} logoutLabel={logoutLabel} brand={brand} />
    </>
  );
}

export function BottomTabBar({ items }: { items: NavItem[] }) {
  return (
    <nav aria-label="Navegação principal" className={styles.bottomTabBar}>
      {items.map((item) => (
        <a
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={styles.bottomTabItem}
        >
          {item.icon && (
            <span className={styles.bottomIcon} aria-hidden="true">
              {item.icon}
            </span>
          )}
          <span>{item.label}</span>
        </a>
      ))}
    </nav>
  );
}

export function TopNav({
  items,
  onLogout,
  logoutLabel = "Sair",
  brand,
}: {
  items: NavItem[];
  onLogout: () => void;
  logoutLabel?: string;
  brand?: string;
}) {
  return (
    <nav aria-label="Navegação principal" className={styles.topNav}>
      {brand && (
        <a href="/" className={cn(styles.brand)}>
          {brand}
        </a>
      )}
      <ul className={styles.topNavLinks}>
        {items.map((item) => (
          <li key={item.href}>
            <a
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={styles.topNavItem}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
      <button type="button" className={styles.topNavItem} onClick={onLogout}>
        {logoutLabel}
      </button>
    </nav>
  );
}
