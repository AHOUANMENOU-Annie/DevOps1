# DevOps : application du cours

Dépôt du cours DevOps, Master 1, ESGIS. Il contient l'application que vous faites
évoluer d'une séance à l'autre.

## Le projet

- **products** : service Node.js qui gère le catalogue de produits, sur le port 3001.
- **orders** : service Node.js qui enregistre les commandes et demande à products le nom
  et le prix de chaque produit commandé, sur le port 3002.
- **MySQL** : une instance unique qui héberge deux bases, `products_db` et `orders_db`,
  créées par les scripts de `db/init`.

Par défaut, chaque service garde ses données en mémoire : il démarre sans base de
données, et les données disparaissent à l'arrêt du service.

## Arborescence

```
services/
  products/
    package.json           dépendances et scripts npm
    src/server.js          démarrage, écoute du port
    src/app.js             configuration, routes, choix du stockage
    src/storage/memory.js  stockage en mémoire
    src/storage/mysql.js   stockage MySQL
    test/app.test.js       tests
  orders/                  même structure
db/
  init/
    01-products.sql        base products_db, utilisateur products_user, table products
    02-orders.sql          base orders_db, utilisateur orders_user, table orders
seance-01/
  diagnostic.sh            vérification du poste
```

## Lancer products en local

Récupérez le dépôt et vérifiez votre poste :

```
git clone https://gitlab.com/oseequenum/devops-m1.git
cd devops-m1
bash seance-01/diagnostic.sh
```

Chaque ligne en `[!!]` est un point à corriger. La ligne marquée `(séance 2)` peut
rester en échec pour la première séance.

Installez les dépendances et démarrez le service :

```
cd services/products
npm install
npm start
```

Le terminal affiche :

```
[products] démarré sur le port 3001, environnement local, stockage memory
```

Laissez ce terminal ouvert. Depuis un autre terminal :

```
curl http://localhost:3001/health
```

| Route | Réponse |
| --- | --- |
| `GET /` | service, version, environnement, nom d'hôte, version de Node, stockage, secondes depuis le démarrage |
| `GET /health` | `{"status":"ok"}`, ou 503 `{"status":"degraded"}` si la base ne répond pas |
| `GET /products` | liste des produits |
| `GET /products/:id` | un produit, 404 s'il n'existe pas |
| `POST /products` | crée un produit depuis `{"name":"Casque","price":59.5}`, 400 si un champ est invalide |

Au démarrage, trois produits existent, d'identifiants 1 à 3.

## Lancer orders en local

orders interroge products à chaque commande : products doit tourner. Dans un deuxième
terminal, depuis la racine du dépôt :

```
cd services/orders
npm install
npm start
```

Le terminal affiche :

```
[orders] démarré sur le port 3002, environnement local, stockage memory
```

| Route | Réponse |
| --- | --- |
| `GET /` | mêmes champs que products |
| `GET /health` | `{"status":"ok"}`, ou 503 `{"status":"degraded"}` si la base ne répond pas |
| `POST /orders` | crée une commande depuis `{"productId":1,"quantity":2}` |
| `GET /orders` | liste des commandes |
| `GET /orders/:id` | une commande, 404 si elle n'existe pas |

Codes de `POST /orders` :

| Code | Cas |
| --- | --- |
| 201 | commande créée |
| 400 | `productId` ou `quantity` n'est pas un entier positif |
| 404 | products ne connaît pas ce produit |
| 502 | products ne répond pas |

## Créer une commande qui traverse les deux services

```
curl http://localhost:3001/products
curl -X POST http://localhost:3002/orders -H "Content-Type: application/json" -d '{"productId":1,"quantity":2}'
curl http://localhost:3002/orders
```

Réponse de la création :

```
{"id":1,"productId":1,"productName":"Clavier mécanique","quantity":2,"unitPrice":49.9,"total":99.8,"createdAt":"..."}
```

orders reçoit un identifiant et une quantité, obtient le nom et le prix auprès de
products, puis calcule le total.

Produit inconnu de products :

```
curl -X POST http://localhost:3002/orders -H "Content-Type: application/json" -d '{"productId":99,"quantity":1}'
```

Réponse 404 : `{"error":"produit introuvable"}`.

Arrêtez products avec Ctrl+C, puis relancez la création de commande. orders répond 502
`{"error":"service products indisponible"}` et son terminal affiche la cause :

```
[orders] appel à http://localhost:3001 en échec : ECONNREFUSED
```

## Variables d'environnement

Chaque service lit sa configuration dans l'environnement. Le code contient uniquement
les valeurs par défaut ci-dessous.

| Variable | Service | Défaut | Rôle |
| --- | --- | --- | --- |
| `PORT` | les deux | 3001 (products), 3002 (orders) | port d'écoute |
| `APP_ENV` | les deux | `local` | nom de l'environnement, renvoyé par `GET /` |
| `APP_VERSION` | les deux | `1.0.0` | version renvoyée par `GET /` |
| `STORAGE` | les deux | `memory` | `memory` ou `mysql` |
| `DB_HOST` | les deux | aucun | hôte MySQL, obligatoire si `STORAGE=mysql` |
| `DB_PORT` | les deux | `3306` | port MySQL |
| `DB_USER` | les deux | aucun | utilisateur MySQL, obligatoire si `STORAGE=mysql` |
| `DB_PASSWORD` | les deux | aucun | mot de passe MySQL, obligatoire si `STORAGE=mysql` |
| `DB_NAME` | les deux | aucun | `products_db` ou `orders_db`, obligatoire si `STORAGE=mysql` |
| `PRODUCTS_URL` | orders | `http://localhost:3001` | adresse du service products |

Une variable se passe devant la commande :

```
PORT=4001 APP_ENV=dev npm start
```

Le mode `mysql` suppose un serveur MySQL 8.0 sur lequel les scripts de `db/init` ont été
exécutés :

```
STORAGE=mysql DB_HOST=localhost DB_USER=products_user DB_PASSWORD=products_pass DB_NAME=products_db npm start
```

Si une variable `DB_` obligatoire manque, le service refuse de démarrer et nomme la
variable absente.

## Lancer les tests

Depuis la racine du dépôt :

```
cd services/products
npm test
cd ../orders
npm test
```

Les tests utilisent le stockage en mémoire et des ports choisis par le système : ils
passent même si les services tournent déjà. Les tests d'orders démarrent leur propre
faux service products.

La ligne `[orders] appel à ... en échec : ECONNREFUSED` affichée pendant les tests
d'orders est attendue : elle provient du test du cas 502.
