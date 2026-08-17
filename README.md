# Progetto di Grafica 3D per i Beni Culturali a.a. 25/26

Il progetto è stato realizzato da Marco Petrucci per il corso di Grafica 3D per i Beni Culturali ``, nell'anno accademico 2025-2026, all'interno del CdLM in Informatica Umanistica dell'Università di Pisa.

È stato sviluppato un archivio digitale interattivo ("Burlamacco 3D") che documenta la sequenza esecutiva e artigianale della cartapesta del Carnevale di Viareggio. Nello specifico, sono stati digitalizzati e integrati per l'esplorazione web i modelli 3D del volto di Burlamacco in tre stadi di lavorazione: il negativo in gesso, il supporto in cartapesta e la superficie finita e dipinta.

---

## Struttura del Progetto e Tecnologie

L'applicazione web consente l'esplorazione geometrica e materica dei modelli acquisiti attraverso un visualizzatore interattivo personalizzato.

* **Librerie di Visualizzazione 3D:** Implementazione di [3DHOP](https://3dhop.net/) e **SpiderGL** per il rendering e la manipolazione della scena 3D tramite canvas, con transizioni fluide guidate dallo scroll della pagina.
* **Gestione Mesh:** Utilizzo della tecnologia [Nexus](https://vcg.isti.cnr.it/vcgtools/nexus/) per la conversione in `.nxs` e `.nxz`, consentendo lo streaming multirisoluzione asincrono di modelli ad alta densità poligonale direttamente nel browser.
* **Elaborazione Modelli (Blender):** I modelli originali e i rispettivi marker d'interesse (`.ply`) sono stati preventivamente allineati nel medesimo spazio di coordinate globali per garantire transizioni di stato invisibili all'utente.
* **Interfaccia (UI/UX):** Interfaccia costruita in HTML5, CSS3 e Vanilla JavaScript, con un design responsivo incentrato sullo storytelling visivo (scrollytelling).
