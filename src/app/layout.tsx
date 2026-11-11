import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { SyncProvider } from "@/components/SyncProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Compara Cesta",
  description: "Descubra em qual tipo de mercado a sua lista de compras sai mais barata em SP.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="bg-slate-50 text-slate-900 antialiased">
        <div className="mx-auto flex min-h-screen max-w-md flex-col">
          <SyncProvider />
          <main className="flex-1 px-4 pb-28 pt-6">{children}</main>
          <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white">
            <div className="mx-auto flex max-w-md">
              <Link href="/" className="flex-1 py-3 text-center text-sm font-medium hover:bg-slate-50">
                🛒 Listas
              </Link>
              <Link href="/comparar" className="flex-1 py-3 text-center text-sm font-medium hover:bg-slate-50">
                🏪 Comparar
              </Link>
              <Link href="/mercados" className="flex-1 py-3 text-center text-sm font-medium hover:bg-slate-50">
                📍 Mercados
              </Link>
              <Link href="/escanear" className="flex-1 py-3 text-center text-sm font-medium hover:bg-slate-50">
                📷 Escanear
              </Link>
              <Link href="/conta" className="flex-1 py-3 text-center text-sm font-medium hover:bg-slate-50">
                👤 Conta
              </Link>
            </div>
          </nav>
        </div>
      </body>
    </html>
  );
}
