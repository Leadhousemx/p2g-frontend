#!/usr/bin/env node

/**
 * Script para generar estrellas estáticas en CSS
 * Ejecutar: node scripts/generate-stars.cjs
 * Output: src/styles/stars-generated.css
 */

const fs = require('fs');
const path = require('path');

// Configuración
const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;

const LAYERS = {
  micro: { count: 900, size: 1, opacity: 0.55, keyframes: '120s' },
  medium: { count: 180, size: 2, opacity: 0.75, keyframes: '160s' },
  large: { count: 40, size: 3, opacity: 0.95, keyframes: '220s' },
};

/**
 * Genera un número aleatorio entero entre min y max
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Genera lista de estrellas con box-shadow
 */
function generateStarShadows(count, size) {
  const shadows = [];
  for (let i = 0; i < count; i++) {
    const x = randomInt(0, CANVAS_WIDTH - size);
    const y = randomInt(0, CANVAS_HEIGHT - size);
    shadows.push(`${x}px ${y}px ${size}px white`);
  }
  return shadows.join(',\n    ');
}

/**
 * Genera el CSS para una capa
 */
function generateLayerCSS(layerName, config) {
  const shadows = generateStarShadows(config.count, config.size);
  return `.stars-${layerName} {
  position: absolute;
  top: 0;
  left: 0;
  width: ${CANVAS_WIDTH}px;
  height: ${CANVAS_HEIGHT}px;
  pointer-events: none;
  will-change: transform;
  transform: translateZ(0);
  box-shadow:
    ${shadows};
  opacity: ${config.opacity};
}

.stars-${layerName}.drift {
  animation: starDrift-${layerName} ${config.keyframes} linear infinite;
}

.stars-${layerName}.drift.offset {
  animation-delay: calc(${config.keyframes} / 2);
  transform: translateY(${CANVAS_HEIGHT}px);
}`;
}

/**
 * Genera el archivo CSS completo
 */
function generateCSS() {
  let css = `/* Auto-generated stars CSS - DO NOT EDIT MANUALLY */
/* Generated: ${new Date().toISOString()} */

`;

  // Generar clases para cada capa
  for (const [layerName, config] of Object.entries(LAYERS)) {
    css += generateLayerCSS(layerName, config) + '\n\n';
  }

  // Agregar keyframes para cada capa
  css += `/* Drift animations */\n\n`;
  for (const [layerName, config] of Object.entries(LAYERS)) {
    css += `@keyframes starDrift-${layerName} {
  0% {
    transform: translateY(0);
  }
  100% {
    transform: translateY(-${CANVAS_HEIGHT}px);
  }
}

`;
  }

  return css;
}

/**
 * Escribe el archivo CSS
 */
function writeCSS() {
  const outputDir = path.join(__dirname, '..', 'src', 'styles');
  const outputFile = path.join(outputDir, 'stars-generated.css');

  try {
    // Crear directorio si no existe
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const css = generateCSS();
    fs.writeFileSync(outputFile, css, 'utf8');

    console.log(`✅ Estrellas generadas exitosamente`);
    console.log(`📁 Archivo: ${outputFile}`);
    console.log(`📊 Capas: ${Object.keys(LAYERS).length}`);
    console.log(`⭐ Total de estrellas: ${Object.values(LAYERS).reduce((sum, layer) => sum + layer.count, 0)}`);
  } catch (error) {
    console.error(`❌ Error generando estrellas:`, error.message);
    process.exit(1);
  }
}

// Generar CSS
writeCSS();
