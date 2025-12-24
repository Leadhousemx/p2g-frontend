module.exports = {
  rules: {
    "no-restricted-imports": ["error", {
      "paths": [
        { "name": "../ui", "message": "Importa desde '@/components/ui' (barrel)." },
        { "name": "../../ui", "message": "Importa desde '@/components/ui' (barrel)." },
        { "name": "@components/ui", "message": "Usa '@/components/ui' (barrel)." },
        { "name": "/src/components/ui", "message": "Usa '@/components/ui' (barrel)." }
      ],
      "patterns": [
        "../ui/*",
        "../../ui/*",
        "@components/ui/*",
        "/src/components/ui/*"
      ]
    }],
  },
};
