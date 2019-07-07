unzip -o citadel_baking_wallets_poc.zip -d /srv/citadel_baking_wallets_poc;
rm -f citadel_baking_wallets_poc.zip;
pm2 restart app;
rm -f install.sh;