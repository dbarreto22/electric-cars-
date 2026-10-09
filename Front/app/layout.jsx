import "./globals.css";

export const metadata = {
  title: "Compará autos eléctricos en Uruguay",
  description:
    "Contanos qué necesitás para comprar un auto eléctrico y revisá tus respuestas.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es-UY">
      <body>{children}</body>
    </html>
  );
}
