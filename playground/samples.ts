export interface Sample {
  id: string;
  label: string;
  hint: string;
  /** Raw clipboard text, exactly as a spreadsheet would put it on the clipboard. */
  text: string;
}

export const samples: Sample[] = [
  {
    id: "sales",
    label: "Sales Q1",
    hint: "Header row + numeric data",
    text: ["Product\tUnits\tPrice", "Keyboard\t12\t39.9", "Mouse\t25\t19.5", "Monitor\t4\t199"].join("\n"),
  },
  {
    id: "gaps",
    label: "Empty cells",
    hint: "Gaps between tabs",
    text: ["A\t\tC", "\tB\t", "1\t\t3"].join("\n"),
  },
  {
    id: "crlf",
    label: "Windows line endings",
    hint: "\\r\\n line endings from Excel",
    text: "Name\r\nAna\r\nLuis",
  },
  {
    id: "column",
    label: "Single column",
    hint: "No tabs at all",
    text: ["apple", "pear", "banana", "kiwi"].join("\n"),
  },
  {
    id: "messy",
    label: "Messy",
    hint: "Whitespace, empty rows and columns",
    text: ["  name  \t  age ", "   \t   ", "Ana\t25", "", "Luis\t"].join("\n"),
  },
];
