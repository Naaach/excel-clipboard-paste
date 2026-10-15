export interface Sample {
  id: string;
  label: string;
  hint: string;
  /** Raw clipboard text, exactly as a spreadsheet would put on the clipboard. */
  text: string;
}

export const samples: Sample[] = [
  {
    id: "sales",
    label: "Ventas Q1",
    hint: "Fila de cabecera + datos numéricos",
    text: [
      "Producto\tUnidades\tPrecio",
      "Teclado\t12\t39.9",
      "Ratón\t25\t19.5",
      "Monitor\t4\t199",
    ].join("\n"),
  },
  {
    id: "gaps",
    label: "Celdas vacías",
    hint: "Huecos entre tabuladores",
    text: ["A\t\tC", "\tB\t", "1\t\t3"].join("\n"),
  },
  {
    id: "crlf",
    label: "Saltos de Windows",
    hint: "Line endings \\r\\n de Excel",
    text: "Nombre\r\nAna\r\nLuis",
  },
  {
    id: "column",
    label: "Una columna",
    hint: "Sin tabuladores",
    text: ["manzana", "pera", "plátano", "kiwi"].join("\n"),
  },
  {
    id: "messy",
    label: "Sucia",
    hint: "Espacios, filas y columnas vacías",
    text: ["  nombre  \t  edad ", "   \t   ", "Ana\t25", "", "Luis\t"].join("\n"),
  },
];
