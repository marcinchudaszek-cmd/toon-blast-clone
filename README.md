# ToonBlast

Kolorowa gra logiczna typu *blast* (klikasz grupy stykających się klocków w tym
samym kolorze) na 160 poziomów. React + TypeScript + Vite + Tailwind, pakowana
na Androida przez Capacitor.

## Rozgrywka

- Stuknij grupę 2+ klocków tego samego koloru, żeby je zbić
- 4 klocki → 🚀 rakieta · 5 → 💣 bomba · 7+ → 🪩 kula disco
- Dwa power-upy obok siebie tworzą **mega combo** (np. rakieta + rakieta czyści
  oba wiersze i obie kolumny, disco + disco całą planszę)
- Przeszkody: skrzynie (kruszą się od sąsiedztwa), lód (topnieje od sąsiedztwa)
  i **kamienie** — odporne na sąsiedztwo, ustępują wyłącznie bezpośredniemu
  trafieniu power-upem. Disco ich nie rusza, bo wybiera cele po kolorze
- Boostery: młotek, +3 ruchy, color bomb; odnawiane co 5 poziomów
- Gdy skończą się ruchy, można dograć 5 za boostera ⌛ (raz na podejście)
- Osiągnięcia, statystyki, codzienne nagrody ze streakiem

## Uruchomienie

```bash
npm install
npm run dev
```

Serwer respektuje zmienną `PORT`, więc bez problemu współistnieje z innymi
projektami na Vite:

```bash
PORT=5199 npm run dev
```

## Balans poziomów jest mierzony, nie zgadywany

Krzywa trudności nie jest wpisana ręcznie. `scripts/sim/engine.ts` to bezgłowy
silnik, który gra **prawdziwą logiką** z `src/game/logic.ts` (ta sama plansza,
te same power-upy, grawitacja, przeszkody). Generator dobiera cele każdego
poziomu tak, żeby zmierzony win-rate bota trafiał w zaplanowaną krzywą — od ~95%
na starcie do ~40% w finale, z rytmem: co 10. poziom oddech, co 25. boss.

```bash
npm run levels:generate                 # przelicza cały src/game/levels.ts
npm run levels:generate -- --only=42    # podgląd pojedynczego poziomu
npm run levels:generate -- --only=42 --write   # naprawa jednego poziomu
npm run levels:validate                 # sprawdza zatwierdzoną krzywą
npm run levels:validate -- --thorough   # więcej prób, mniej szumu
```

Walidator kończy się błędem, gdy którykolwiek poziom jest niemożliwy do
przejścia, zbyt trywialny, zbyt często kończy się planszą bez ruchów albo gdy
krzywa się odwróci. Warto go uruchomić przed wydaniem — dokładnie ten problem
kiedyś tu był: poziomy wymagały zebrania 414 klocków w 6 ruchów na planszy o 120
polach, czyli ~100 poziomów było nieprzechodnych.

`src/game/levels.ts` jest **generowany** — nie edytuj go ręcznie.

## Build na Androida

```bash
npm run build:android
cd android && ./gradlew assembleDebug     # lub assembleRelease
```

### Podpisywanie

Dane klucza czytane są z `android/keystore.properties`, który **nie jest w
repozytorium**. Skopiuj `android/keystore.properties.example`, wpisz swoje
wartości i wskaż własny keystore:

```properties
storeFile=release.keystore
storePassword=...
keyAlias=...
keyPassword=...
```

Bez tego pliku build release przechodzi, ale APK jest **niepodpisany** (gradle
wypisze ostrzeżenie) — repo pozostaje budowalne dla każdego, kto je sklonuje,
a klucz nigdy nie opuszcza maszyny.

## Struktura

```
src/game/       logika gry, stan (useReducer), zapis, osiągnięcia, ustawienia
src/components/ interfejs i autorskie ikony SVG
scripts/        symulator, generator i walidator poziomów
android/        projekt Capacitora
```

## Licencje

Font Fredoka na licencji SIL Open Font License 1.1 — szczegóły i atrybucja w
[`src/assets/fonts/README.md`](src/assets/fonts/README.md).
