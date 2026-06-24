const { getLocalizedTitle } = require('./frontend/src/utils/titleParser.js');
console.log("TEST 1: Մեր սուրբ Աստված / Our holy God / Наш святой Бог");
console.log("am:", getLocalizedTitle("Մեր սուրբ Աստված / Our holy God / Наш святой Бог", "am"));
console.log("en:", getLocalizedTitle("Մեր սուրբ Աստված / Our holy God / Наш святой Бог", "en"));
console.log("ru:", getLocalizedTitle("Մեր սուրբ Աստված / Our holy God / Наш святой Бог", "ru"));

console.log("\nTEST 2: Մեր սուրբ Աստված / Mer Surb Astvac");
console.log("am:", getLocalizedTitle("Մեր սուրբ Աստված / Mer Surb Astvac", "am"));
console.log("en:", getLocalizedTitle("Մեր սուրբ Աստված / Mer Surb Astvac", "en"));
console.log("ru:", getLocalizedTitle("Մեր սուրբ Աստված / Mer Surb Astvac", "ru"));

console.log("\nTEST 3: Наш святой Бог / Our holy God");
console.log("am:", getLocalizedTitle("Наш святой Бог / Our holy God", "am"));
console.log("en:", getLocalizedTitle("Наш святой Бог / Our holy God", "en"));
console.log("ru:", getLocalizedTitle("Наш святой Бог / Our holy God", "ru"));
