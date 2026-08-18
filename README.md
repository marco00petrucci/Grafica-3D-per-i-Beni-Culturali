# Progetto di Grafica 3D per i Beni Culturali a.a. 25/26

Il progetto è stato realizzato da Marco Petrucci per il corso di Grafica 3D per i Beni Culturali tenuto dai professori Marco Callieri e Marco Potenziani, nell'anno accademico 2025-2026, all'interno del CdL in Informatica Umanistica magistrale dell'Università di Pisa.

È stato sviluppato un archivio digitale interattivo ("Burlamacco 3D") che documenta la sequenza esecutiva e artigianale della cartapesta del Carnevale di Viareggio. Nello specifico, sono stati digitalizzati e integrati per l'esplorazione web i modelli 3D del volto di Burlamacco in tre stadi di lavorazione: il negativo in gesso, il supporto in cartapesta e la superficie finita e dipinta.

---

## Struttura del Progetto e Tecnologie

L'applicazione web consente l'esplorazione geometrica e materica dei modelli acquisiti attraverso un visualizzatore interattivo personalizzato.

* **Librerie di Visualizzazione 3D:** Implementazione di [3DHOP](https://3dhop.net/) e **SpiderGL** per il rendering e la manipolazione della scena 3D tramite canvas, con transizioni fluide guidate dallo scroll della pagina.
* **Gestione Mesh:** Utilizzo della tecnologia [Nexus](https://vcg.isti.cnr.it/vcgtools/nexus/) per la conversione in `.nxs` e `.nxz`, consentendo lo streaming multirisoluzione asincrono di modelli ad alta densità poligonale direttamente nel browser.
* **Interfaccia (UI/UX):** Interfaccia costruita in HTML5, CSS3 e Vanilla JavaScript, con un design responsivo incentrato sullo storytelling visivo (scrollytelling).

---

## Gestione dei Modelli 3D e delle Fasi

Il sito documenta tre fasi di lavorazione (`calco`, `cartapesta`, `colore`), ciascuna associata a un modello Nexus (`.nxz`) diverso. Il cambio di modello avviene in due modi, gestiti dalla funzione `loadModel3D()`:

* **Automatico, guidato dallo scroll:** la funzione `updateActivePhase()` calcola quale sezione `.phase` si trova a metà schermo e, se la fase attiva cambia, carica il modello corrispondente e aggiorna il tab attivo nella toolbar.
* **Manuale:** cliccando uno dei tab (`01. Calco in Gesso`, `02. Supporto in Cartapesta`, `03. Manufatto Dipinto`) si forza il caricamento diretto del modello selezionato.

Per evitare sovrapposizioni tra caricamenti concorrenti, è presente un semplice sistema di coda: se un modello sta ancora caricando (`modelLoading`), la richiesta successiva viene salvata in `pendingModelType` e processata al termine del caricamento in corso.

---

## Gestione degli Hotspot

Gli hotspot (punti di interesse cliccabili sul modello 3D) sono definiti in `HOTSPOTS_CONFIG`, con una configurazione indipendente per ciascuna fase. Ogni hotspot specifica: etichetta testuale, mesh marker `.ply` associata, colore, matrice di trasformazione e valori di trasparenza (`alpha`/`alphaHigh`).

Quando un modello possiede hotspot, `loadModel3D()`:

1. estrae l'elenco delle mesh marker uniche necessarie e le inietta dinamicamente tra i `meshes` della scena passata a `presenter.setScene()`;
2. imposta gli hotspot come inizialmente invisibili tramite `setSpotVisibility`;
3. mostra o nasconde il relativo pulsante in toolbar a seconda che il modello corrente ne contenga o meno.

L'attivazione/disattivazione della visibilità degli hotspot è affidata al pulsante dedicato della toolbar, che alterna `setSpotVisibility` ed `enableOnHover` in base allo stato corrente. Il click su un hotspot (evento `_onPickedSpot`) mostra un'etichetta fluttuante (`#spot-label`) posizionata alle coordinate dell'ultimo click/tocco registrato, con comparsa/scomparsa animata e scomparsa automatica dopo 3 secondi. Il passaggio del mouse su un hotspot (`_onEnterSpot`/`_onLeaveSpot`) cambia inoltre il cursore in un puntatore.

---

## Interazione e Toolbar del Visualizzatore

Oltre agli hotspot, la toolbar personalizzata sopra il canvas 3D espone i seguenti comandi, tutti collegati alle funzioni native del `presenter` 3DHOP (con icone personalizzate in formato SVG rispetto alle skins in formato png di default):

* **Illuminazione:** attiva/disattiva l'illuminazione di scena (`enableSceneLighting`) e, quando attiva, mostra un secondo pulsante per il controllo interattivo della direzione della luce (`enableLightTrackball`).
* **Colore/Render:** alterna tra colore reale del modello e colore solido (`toggleInstanceSolidColor`).
* **Camera:** alterna tra proiezione prospettica e ortografica (`toggleCameraType`).
* **Screenshot:** salva un'istantanea del canvas con sfondo trasparente (`saveScreenshot`).
* **Fronte/Retro:** due pulsanti testuali che animano la trackball verso posizioni predefinite in `VIEWS_TRACKBALL` tramite `animateToTrackballPosition`.
* **Zoom:** uno slider calcola direttamente la distanza della trackball in proporzione al valore selezionato (0-100), scrivendola nello stato restituito da `getTrackballPosition`/`setTrackballPosition`.
* **Fullscreen:** utilizza le API native del browser (`requestFullscreen`/`exitFullscreen`) sul contenitore del visualizzatore, con aggiornamento dell'icona alla modifica dello stato.

---

## Rotazione e Zoom Guidati dallo Scroll

Durante lo scroll della pagina, la funzione `rotateOnScroll()` (invocata tramite `requestAnimationFrame` per limitare il carico) calcola lo spostamento verticale (`delta`) rispetto all'ultima posizione nota e lo traduce in:

* una rotazione orizzontale della trackball, proporzionale al delta;
* una variazione della distanza (zoom), vincolata tra i limiti minimo e massimo definiti in `TRACKBALL_DIST_RANGE`.

Questo comportamento è attivo solo su dispositivi con puntatore preciso (`pointer: fine`) e su schermi sufficientemente larghi (`> 980px`), per evitare interferenze con lo scroll touch su mobile. Lo slider dello zoom viene sincronizzato bidirezionalmente con la posizione della trackball tramite la callback nativa `onTrackballUpdate`, così da riflettere anche le variazioni di zoom effettuate con rotellina o pinch.

---

## Animazioni di Comparsa (Scroll Reveal)

Gli elementi testuali principali (etichette di sezione, step delle fasi, voci della timeline, box informativo) vengono animati in comparsa tramite `IntersectionObserver`: alla loro entrata in viewport (soglia 15%) viene aggiunta la classe `is-visible`, che attiva la transizione CSS di opacità e traslazione definita dalla classe `.reveal`. L'osservazione di ciascun elemento viene interrotta dopo la prima comparsa per evitare ricalcoli superflui.

---

## Effetto Coriandoli (Hero)

Nella sezione hero è presente un'animazione a canvas 2D di coriandoli in caduta, gestita da `initHeroCanvas()`. Ogni particella è un'istanza della classe `Confetto`, con proprietà generate casualmente (dimensione, velocità di caduta, ampiezza e velocità di oscillazione laterale, rotazione, "flip" per simulare lo spessore) e viene ridisegnata a ogni frame tramite `requestAnimationFrame`. Il numero di particelle si riduce automaticamente su schermi stretti (`< 768px`) per contenere il carico; l'intero canvas viene inoltre nascosto via CSS sotto i 768px.

---

## Design Responsivo

Il layout è pensato mobile-first nei punti critici tramite media query dedicate:

* sotto i 980px il layout a due colonne (testo/visualizzatore) della sezione "Patrimonio" collassa su una sola colonna, disattivando lo scroll guidato (che richiede spazio verticale esteso per fase);
* sotto i 768px la toolbar del visualizzatore passa da orizzontale a verticale, il canvas 3D riduce l'altezza e il canvas dei coriandoli viene disattivato;
* sotto i 700px la timeline storica passa da disposizione alternata a colonna singola allineata a sinistra.
