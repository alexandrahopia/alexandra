---
title: Etusivu
---

# Tehtäväpalautukset

- [Viikko 1](vko1.md)
- [Viikko 2](vko2.md)
- [Viikko 3](vko3.md)
- [Viikko 4](vko4.md)
- [Viikko 5](vko5.md)
- [Viikko 6](vko6.md)

## Harjoitustyö
- [Harjoitustyö](harjoitustyo.md)

---
title: Viikko 2
---
# Viikko 2

Jekyll-sivuston voi automatisoida GitHub Actionsilla siten, että sivu rakentuu ja julkaistaan aina pushin jälkeen. Työnkulku käynnistyy `on: push` -tapahtumasta, ajaa Jekyll-buildin ja siirtää tuotoksen GitHub Pagesiin. Tämä vähentää manuaalisia vaiheita ja varmistaa, että julkaisu on aina ajan tasalla.

Web-sovelluksen CI/CD-putkisto rakentuu samalla periaatteella: CI-vaiheessa ajetaan testit, linttaus ja buildi; CD-vaiheessa julkaisu ympäristöön. Työkaluina voi käyttää GitHub Actionsia ajamaan jobit, Bundleria ja Jekylliä staattiselle sivulle, sekä laajemmissa projekteissa esim. Node + npm/yarn, Jest/Playwright testaukseen ja ESLint/Prettier laadun varmistukseen. Julkaisun kohteena voi olla GitHub Pages, Netlify tai Vercel. Cache ja ympäristömuuttujat nopeuttavat ajokertoja ja tekevät buildista toistettavan.
