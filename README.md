# Site AdaptSW

Site statique présentant le TIPE AdaptSW de Youssef Litayem.

Le contenu des documents a été réécrit directement dans le site : aucun PDF n'est nécessaire pour le consulter.

## Ouvrir le site en local

Le site ne nécessite aucune installation.

- ouvrir directement `index.html` dans un navigateur ; ou
- lancer un petit serveur local depuis ce dossier :

```bash
python3 -m http.server 8000
```

Puis ouvrir `http://localhost:8000`.

## Publier avec GitHub Pages

1. Créer un dépôt GitHub nommé, par exemple, `AdaptSW`.
2. Envoyer tous les fichiers de ce dossier à la racine du dépôt.
3. Dans **Settings → Pages**, sélectionner **Deploy from a branch**.
4. Choisir la branche `main` et le dossier `/root`.

Le lien GitHub utilisé dans le site est actuellement :

```text
https://github.com/litayem2005/AdaptSW
```

Il peut être modifié dans `index.html` si le dépôt porte un autre nom.

## Fichiers

- `index.html` : contenu complet du site ;
- `styles.css` : mise en page et adaptation mobile ;
- `script.js` : navigation, graphique et visualisation interactive ;
- `assets/favicon.svg` : icône du site ;
- `assets/mathjax-tex-svg.js` : affichage local des formules LaTeX avec MathJax ;
- `.nojekyll` : empêche GitHub Pages d'appliquer Jekyll.

## Remarque sur la simulation

La visualisation animée sert à expliquer le fonctionnement de Spray-and-Wait et d'AdaptSW. Elle n'est pas présentée comme un résultat expérimental et ne remplace pas les expériences menées avec les téléphones Android.
