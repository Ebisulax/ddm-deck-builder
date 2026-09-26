"use strict";


/* =========================================================
   CONFIG
   ========================================================= */

const CONFIG = {

    JSON_URL:
        "./cards.json",

    FRONT_DIR:
        "./Karten/cards/",

    BACK_DIR:
        "./Karten/cards backs/",

    ALT_DIRS: [
        "./Karten/cards/",
        "./Karten/cards alt arts/",
        "./Karten/cards/cards alt arts/"
    ],

    DECK_SIZE:
        15,

    COPY_LIMIT:
        3,

    STORAGE_KEY:
        "ddm-deck"
};


/* =========================================================
   STATE
   ========================================================= */

let cards = [];

let visibleCards = [];

let deck = [];

let previewState = {

    cardId:
        null,

    artworkId:
        null
};


/* =========================================================
   SHORTCUTS
   ========================================================= */

const $ =
    selector =>
        document.querySelector(
            selector
        );


const $$ =
    selector =>
        Array.from(
            document.querySelectorAll(
                selector
            )
        );


/* =========================================================
   HELPERS
   ========================================================= */

function normalizeText(
    value
) {

    return String(
        value ?? ""
    )
        .trim()
        .toLowerCase();
}


function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            "\"",
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}


function unique(
    values
) {

    return [
        ...new Set(
            values.filter(
                Boolean
            )
        )
    ];
}


function slugify(
    value
) {

    return String(
        value ?? ""
    )
        .trim()
        .toLowerCase()
        .replace(
            /[^a-z0-9]+/g,
            "-"
        )
        .replace(
            /^-|-$/g,
            ""
        );
}


function filenameOnly(
    path
) {

    if (!path) {

        return "";
    }


    return String(
        path
    )
        .replaceAll(
            "\\",
            "/"
        )
        .split("/")
        .pop();
}


function templatePath(
    template,
    name
) {

    if (!template) {

        return null;
    }


    return template.replaceAll(
        "{name}",
        name
    );
}


/* =========================================================
   IMAGE PATH ENCODING
   ========================================================= */

function encodeImagePath(
    path
) {

    if (!path) {

        return "";
    }


    const value =
        String(
            path
        );


    /*
       External URLs are left mostly intact.
    */

    if (
        value.startsWith(
            "http://"
        ) ||
        value.startsWith(
            "https://"
        ) ||
        value.startsWith(
            "data:"
        ) ||
        value.startsWith(
            "blob:"
        )
    ) {

        return encodeURI(
            value
        )
            .replaceAll(
                "#",
                "%23"
            );
    }


    const prefix =
        value.startsWith(
            "./"
        )
            ? "./"
            : value.startsWith(
                "/"
            )
                ? "/"
                : "";


    const rest =
        value.replace(
            /^\.?\//,
            ""
        );


    return prefix +
        rest
            .split("/")
            .map(
                segment =>
                    encodeURIComponent(
                        segment
                    )
            )
            .join("/");
}


/* =========================================================
   IMAGE FALLBACK
   ========================================================= */

function applyImageCandidates(
    image,
    candidates
) {

    if (!image) {

        console.error(
            "Image element not found."
        );

        return;
    }


    const paths =
        unique(
            candidates ?? []
        );


    let index =
        0;


    function loadNext() {

        if (
            index >=
            paths.length
        ) {

            image.onerror =
                null;

            image.removeAttribute(
                "src"
            );

            console.warn(
                "Could not load image:",
                paths
            );

            return;
        }


        const path =
            paths[
                index
            ];


        index++;


        image.src =
            encodeImagePath(
                path
            );
    }


    image.onerror =
        loadNext;


    loadNext();
}


/* =========================================================
   IMAGE PATH CANDIDATES
   ========================================================= */

function standardFrontCandidates(
    card,
    explicitPath
) {

    return unique([

        explicitPath,

        templatePath(
            card.frontTemplate,
            card.name
        ),

`${CONFIG.FRONT_DIR}${card.name.toLowerCase()}.jpg`,

`${CONFIG.FRONT_DIR}${card.name.toLowerCase()}.jpeg`,

`${CONFIG.FRONT_DIR}${card.name.toLowerCase()}.png`,

`${CONFIG.FRONT_DIR}${card.name.toLowerCase()}.webp`

    ]);
}


function backCandidates(
    card,
    explicitPath
) {

    return unique([

        explicitPath
            ? explicitPath.toLowerCase()
            : null,

        templatePath(
            card.backTemplate,
            card.name
        )
            ?.toLowerCase(),

        `${CONFIG.BACK_DIR}${card.name.toLowerCase()} back.jpg`,

        `${CONFIG.BACK_DIR}${card.name.toLowerCase()} back.jpeg`,

        `${CONFIG.BACK_DIR}${card.name.toLowerCase()} back.png`,

        `${CONFIG.BACK_DIR}${card.name.toLowerCase()} back.webp`

    ]);
}


function alternateCandidates(
    path
) {

const filename =
    filenameOnly(
        path
    ).toLowerCase();


    return unique([

        path,

        ...CONFIG.ALT_DIRS.map(
            directory =>
                `${directory}${filename}`
        )

    ]);
}


/* =========================================================
   NORMALIZATION
   ========================================================= */

function normalizeKeyword(
    keyword
) {

    if (
        typeof keyword ===
        "string"
    ) {

        return {

            name:
                keyword
        };
    }


    return {

        name:
            keyword?.name ??
            "",

        ...(keyword?.value !==
        undefined

            ? {

                value:
                    keyword.value
            }

            : {})
    };
}


function normalizeCrest(
    crest
) {

    let crestName =
        normalizeText(
            crest.crest
        );


    /*
       The old JSON may still use "magic".
       The game/UI calls it Spell.
    */

    if (
        crestName ===
        "magic"
    ) {

        crestName =
            "spell";
    }


    return {

        roll:
            Number(
                crest.roll
            ),

        crest:
            crestName,

        amount:
            Number(
                crest.amount
            ) || 0
    };
}


function normalizeCard(
    raw,
    meta
) {

    const card = {

        ...raw,

        id:
            String(
                raw.id ??
                slugify(
                    raw.name
                )
            ),

        name:
            raw.name ??
            "Unknown Card",

        level:
            Number(
                raw.level
            ) || 0,

        category:
            normalizeText(
                raw.category
            ),

        monsterType:
            raw.monsterType ??
            null,

        itemType:
            raw.itemType ??
            null,

        itemSubtype:
            raw.itemSubtype ??
            null,

        hp:
            raw.hp ??
            null,

        atk:
            raw.atk ??
            null,

        def:
            raw.def ??
            null,

        effect:
            raw.effect ??
            "",

        keywords:
            (
                raw.keywords ??
                []
            )
                .map(
                    normalizeKeyword
                ),

        crests:
            (
                raw.crests ??
                []
            )
                .map(
                    normalizeCrest
                ),

        frontTemplate:
            meta.imageFrontTemplate ??
            null,

        backTemplate:
            meta.imageBackTemplate ??
            null
    };


    card.backImages =
        backCandidates(
            card,
            raw.imageBack ??
            raw.backImage
        );


    /* =====================================================
       ARTWORKS
       ===================================================== */

    if (
        Array.isArray(
            raw.artworks
        ) &&
        raw.artworks.length
    ) {

        card.artworks =
            raw.artworks.map(
                (
                    artwork,
                    index
                ) => {

                    const id =
                        String(
                            artwork.id ??
                            (
                                index === 0
                                    ? "standard"
                                    : `alt-${index}`
                            )
                        );


                    const standard =
                        id ===
                            "standard" ||
                        index ===
                            0;


                    return {

                        id,

                        name:
                            artwork.name ??
                            (
                                standard
                                    ? "Standard Art"
                                    : `Alternate Art ${index}`
                            ),

                        images:
                            standard

                                ? standardFrontCandidates(
                                    card,
                                    artwork.imageFront
                                )

                                : alternateCandidates(
                                    artwork.imageFront
                                )
                    };
                }
            );

    } else {

        card.artworks = [

            {

                id:
                    "standard",

                name:
                    "Standard Art",

                images:
                    standardFrontCandidates(
                        card,
                        raw.imageFront ??
                        raw.frontImage
                    )
            }
        ];


        (
            raw.altArts ??
            []
        )
            .forEach(
                (
                    path,
                    index
                ) => {

                    card.artworks.push({

                        id:
                            `alt-${index + 1}`,

                        name:
                            raw.altArts.length >
                            1

                                ? `Alternate Art ${index + 1}`

                                : "Alternate Art",

                        images:
                            alternateCandidates(
                                path
                            )
                    });
                }
            );
    }


    return card;
}


/* =========================================================
   LOAD DATABASE
   ========================================================= */

async function loadCards() {

    try {

        const response =
            await fetch(
                CONFIG.JSON_URL,
                {

                    cache:
                        "no-store"
                }
            );


        if (
            !response.ok
        ) {

            throw new Error(
                `HTTP ${response.status}`
            );
        }


        const json =
            await response.json();


        const meta =
            Array.isArray(
                json
            )

                ? {}

                : (
                    json.meta ??
                    {}
                );


        const rawCards =
            Array.isArray(
                json
            )

                ? json

                : json.cards;


        if (
            !Array.isArray(
                rawCards
            )
        ) {

            throw new Error(
                "cards.json does not contain a cards array."
            );
        }


        cards =
            rawCards.map(
                raw =>
                    normalizeCard(
                        raw,
                        meta
                    )
            );


        populateFilterOptions();

        createCrestFilters();

        loadDeck();

        applyFilters();


        console.log(
            `Loaded ${cards.length} cards.`
        );

    } catch (
        error
    ) {

        console.error(
            error
        );


        const resultCount =
            $("#resultCount");


        if (
            resultCount
        ) {

            resultCount.textContent =
                "Failed to load cards.json";
        }


        const cardPool =
            $("#cardPool");


        if (
            cardPool
        ) {

            cardPool.innerHTML = `

                <div class="no-results">

                    <strong>
                        Could not load cards.json
                    </strong>

                    <br><br>

                    ${escapeHtml(
                        error.message
                    )}

                    <br><br>

                    Use VS Code Live Server rather than opening
                    index.html directly.

                </div>
            `;
        }
    }
}


/* =========================================================
   CARD CATEGORY
   ========================================================= */

function displayCategory(
    card
) {

    if (
        card.category ===
        "monster"
    ) {

        return "Monster";
    }


    if (
        normalizeText(
            card.itemType
        ) ===
        "spell"
    ) {

        return "Spell";
    }


    if (
        normalizeText(
            card.itemType
        ) ===
        "trap"
    ) {

        return "Trap";
    }


    return (
        card.itemType ??
        "Item"
    );
}


/* =========================================================
   KEYWORDS
   ========================================================= */

function formatKeyword(
    keyword
) {

    if (
        keyword.value ===
        undefined ||
        keyword.value ===
        null ||
        keyword.value ===
        ""
    ) {

        return keyword.name;
    }


    return `${keyword.name} ${keyword.value}`;
}


/* =========================================================
   SELECT OPTIONS
   ========================================================= */

function fillSelect(
    element,
    values
) {

    if (!element) {

        return;
    }


    const first =
        element.options[0]
            ?.outerHTML ??
        `<option value="">Any</option>`;


    element.innerHTML =
        first +
        values
            .map(
                value =>
                    `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`
            )
            .join("");
}


function populateFilterOptions() {

    const monsterTypes =
        unique(
            cards.map(
                card =>
                    card.monsterType
            )
        )
            .sort(
                (a, b) =>
                    a.localeCompare(
                        b
                    )
            );


    const itemSubtypes =
        unique(
            cards.map(
                card =>
                    card.itemSubtype
            )
        )
            .sort(
                (a, b) =>
                    a.localeCompare(
                        b
                    )
            );


    const keywords =
        unique(
            cards.flatMap(
                card =>
                    card.keywords.map(
                        keyword =>
                            keyword.name
                    )
            )
        )
            .sort(
                (a, b) =>
                    a.localeCompare(
                        b
                    )
            );


    fillSelect(
        $("#monsterTypeFilter"),
        monsterTypes
    );


    fillSelect(
        $("#itemSubtypeFilter"),
        itemSubtypes
    );


    fillSelect(
        $("#keywordFilter"),
        keywords
    );
}


/* =========================================================
   CRESTS
   ========================================================= */

function crestTypes() {

    return unique(

        cards.flatMap(
            card =>
                card.crests
                    .map(
                        crest =>
                            crest.crest
                    )
                    .filter(
                        crest =>
                            crest &&
                            crest !==
                            "star"
                    )
        )

    )
        .sort(
            (a, b) =>
                a.localeCompare(
                    b
                )
        );
}


function formatCrestName(
    crest
) {

    return String(
        crest
    )
        .split(
            /[-_ ]+/
        )
        .map(
            word =>
                word.charAt(0)
                    .toUpperCase() +
                word.slice(1)
        )
        .join(" ");
}


function createCrestFilters() {

    const container =
        $("#crestFilters");


    if (!container) {

        return;
    }


    container.innerHTML =
        "";


    crestTypes()
        .forEach(
            crest => {

                const element =
                    document.createElement(
                        "div"
                    );


                element.className =
                    "crest-filter";


                element.innerHTML = `

                    <label>

                        <input
                            type="checkbox"
                            data-crest-checkbox="${escapeHtml(crest)}"
                        >

                        ${escapeHtml(
                            formatCrestName(
                                crest
                            )
                        )}

                    </label>


                    <input
                        type="number"
                        min="1"
                        value="1"
                        data-crest-min="${escapeHtml(crest)}"
                    >
                `;


                container.appendChild(
                    element
                );
            }
        );
}


/* =========================================================
   NUMBER FILTERS
   ========================================================= */

function getNumberFilter(
    stat
) {

    const operatorElement =
        $(`#${stat}Operator`);


    const valueElement =
        $(`#${stat}Value`);


    if (
        !operatorElement ||
        !valueElement
    ) {

        return null;
    }


    const operator =
        operatorElement.value;


    if (
        !operator ||
        valueElement.value ===
        ""
    ) {

        return null;
    }


    const value =
        Number(
            valueElement.value
        );


    if (
        Number.isNaN(
            value
        )
    ) {

        return null;
    }


    return {

        operator,

        value
    };
}


function compareNumber(
    actual,
    operator,
    expected
) {

    if (
        actual ===
        null ||
        actual ===
        undefined
    ) {

        return false;
    }


    const number =
        Number(
            actual
        );


    if (
        Number.isNaN(
            number
        )
    ) {

        return false;
    }


    switch (
        operator
    ) {

        case "<":

            return (
                number <
                expected
            );


        case "<=":

            return (
                number <=
                expected
            );


        case "=":

        case "==":

            return (
                number ===
                expected
            );


        case ">=":

            return (
                number >=
                expected
            );


        case ">":

            return (
                number >
                expected
            );


        default:

            return true;
    }
}


/* =========================================================
   CREST FILTERING
   ========================================================= */

function getCrestAmount(
    card,
    crestName
) {

    return card.crests

        .filter(
            crest =>
                crest.crest ===
                crestName
        )

        .reduce(
            (
                total,
                crest
            ) =>
                total +
                crest.amount,
            0
        );
}


function matchesCrestFilters(
    card
) {

    const enabled =
        $$(
            "[data-crest-checkbox]:checked"
        )
            .map(
                checkbox => {

                    const crest =
                        checkbox.dataset
                            .crestCheckbox;


                    const minElement =
                        document.querySelector(
                            `[data-crest-min="${CSS.escape(crest)}"]`
                        );


                    return {

                        crest,

                        min:
                            Number(
                                minElement
                                    ?.value
                            ) || 1
                    };
                }
            );


    if (
        !enabled.length
    ) {

        return true;
    }


    const matchMode =
        document.querySelector(
            "input[name='crestMatch']:checked"
        )
            ?.value ??
        "all";


    const matches =
        enabled.map(
            filter =>
                getCrestAmount(
                    card,
                    filter.crest
                ) >=
                filter.min
        );


    if (
        matchMode ===
        "any"
    ) {

        return matches.some(
            Boolean
        );
    }


    return matches.every(
        Boolean
    );
}


/* =========================================================
   SEARCH
   ========================================================= */

function matchesSearch(
    card,
    query
) {

    query =
        normalizeText(
            query
        );


    if (!query) {

        return true;
    }


    const searchable =
        [

            card.name,

            card.effect,

            card.monsterType,

            card.itemType,

            card.itemSubtype,

            card.keywords
                .map(
                    formatKeyword
                )
                .join(" "),

            card.crests
                .map(
                    crest =>
                        formatCrestName(
                            crest.crest
                        )
                )
                .join(" "),

            `level ${card.level}`

        ]
            .filter(
                Boolean
            )
            .join(" ")
            .toLowerCase();


    return searchable.includes(
        query
    );
}


/* =========================================================
   APPLY FILTERS
   ========================================================= */

function applyFilters() {

    const search =
        $("#searchInput")
            ?.value ??
        "";


    const effectSearch =
        normalizeText(
            $("#effectSearch")
                ?.value
        );


    const categories =
        $$(
            "input[name='category']:checked"
        )
            .map(
                input =>
                    normalizeText(
                        input.value
                    )
            );


    const levels =
        $$(
            "input[name='level']:checked"
        )
            .map(
                input =>
                    Number(
                        input.value
                    )
            );


    const monsterType =
        normalizeText(
            $("#monsterTypeFilter")
                ?.value
        );


    const itemSubtype =
        normalizeText(
            $("#itemSubtypeFilter")
                ?.value
        );


    const keyword =
        normalizeText(
            $("#keywordFilter")
                ?.value
        );


    const hp =
        getNumberFilter(
            "hp"
        );


    const atk =
        getNumberFilter(
            "atk"
        );


    const def =
        getNumberFilter(
            "def"
        );


    let result =
        cards.filter(
            card => {


                if (
                    !matchesSearch(
                        card,
                        search
                    )
                ) {

                    return false;
                }


                if (
                    effectSearch &&
                    !normalizeText(
                        card.effect
                    )
                        .includes(
                            effectSearch
                        )
                ) {

                    return false;
                }


                if (
                    categories.length &&
                    !categories.includes(
                        normalizeText(
                            displayCategory(
                                card
                            )
                        )
                    )
                ) {

                    return false;
                }


                if (
                    levels.length &&
                    !levels.includes(
                        card.level
                    )
                ) {

                    return false;
                }


                if (
                    monsterType &&
                    normalizeText(
                        card.monsterType
                    ) !==
                    monsterType
                ) {

                    return false;
                }


                if (
                    itemSubtype &&
                    normalizeText(
                        card.itemSubtype
                    ) !==
                    itemSubtype
                ) {

                    return false;
                }


                if (
                    keyword &&
                    !card.keywords.some(
                        entry =>
                            normalizeText(
                                entry.name
                            ) ===
                            keyword
                    )
                ) {

                    return false;
                }


                if (
                    hp &&
                    !compareNumber(
                        card.hp,
                        hp.operator,
                        hp.value
                    )
                ) {

                    return false;
                }


                if (
                    atk &&
                    !compareNumber(
                        card.atk,
                        atk.operator,
                        atk.value
                    )
                ) {

                    return false;
                }


                if (
                    def &&
                    !compareNumber(
                        card.def,
                        def.operator,
                        def.value
                    )
                ) {

                    return false;
                }


                if (
                    !matchesCrestFilters(
                        card
                    )
                ) {

                    return false;
                }


                return true;
            }
        );


    result =
        sortCards(
            result
        );


    visibleCards =
        [];


    result.forEach(
        card => {

            card.artworks
                .forEach(
                    artwork => {

                        visibleCards.push({

                            card,

                            artwork
                        });
                    }
                );
        }
    );


    renderCardPool();
}


/* =========================================================
   SORT
   ========================================================= */

function sortCards(
    cardsToSort
) {

    const result =
        [
            ...cardsToSort
        ];


    const sort =
        $("#sortFilter")
            ?.value ??
        "name-asc";


    switch (
        sort
    ) {

        case "name-desc":

            result.sort(
                (a, b) =>
                    b.name.localeCompare(
                        a.name
                    )
            );

            break;


        case "level-asc":

            result.sort(
                (a, b) =>
                    a.level -
                    b.level ||
                    a.name.localeCompare(
                        b.name
                    )
            );

            break;


        case "level-desc":

            result.sort(
                (a, b) =>
                    b.level -
                    a.level ||
                    a.name.localeCompare(
                        b.name
                    )
            );

            break;


        case "hp-desc":

            result.sort(
                (a, b) =>
                    (
                        Number(
                            b.hp
                        ) || -1
                    ) -
                    (
                        Number(
                            a.hp
                        ) || -1
                    )
            );

            break;


        case "atk-desc":

            result.sort(
                (a, b) =>
                    (
                        Number(
                            b.atk
                        ) || -1
                    ) -
                    (
                        Number(
                            a.atk
                        ) || -1
                    )
            );

            break;


        case "def-desc":

            result.sort(
                (a, b) =>
                    (
                        Number(
                            b.def
                        ) || -1
                    ) -
                    (
                        Number(
                            a.def
                        ) || -1
                    )
            );

            break;


        default:

            result.sort(
                (a, b) =>
                    a.name.localeCompare(
                        b.name
                    )
            );
    }


    return result;
}


/* =========================================================
   LOOKUPS
   ========================================================= */

function findCard(
    cardId
) {

    return cards.find(
        card =>
            String(
                card.id
            ) ===
            String(
                cardId
            )
    );
}


function findArtwork(
    card,
    artworkId
) {

    if (!card) {

        return null;
    }


    return (
        card.artworks.find(
            artwork =>
                String(
                    artwork.id
                ) ===
                String(
                    artworkId
                )
        ) ??
        card.artworks[0] ??
        null
    );
}


/* =========================================================
   COPY COUNT
   ========================================================= */

function copyCount(
    cardId
) {

    return deck.filter(
        entry =>
            String(
                entry.cardId
            ) ===
            String(
                cardId
            )
    ).length;
}


/* =========================================================
   CARD POOL
   ========================================================= */

function renderCardPool() {

    const container =
        $("#cardPool");


    if (!container) {

        return;
    }


    container.innerHTML =
        "";


    const uniqueCards =
        new Set(
            visibleCards.map(
                result =>
                    result.card.id
            )
        ).size;


    const resultCount =
        $("#resultCount");


    if (
        resultCount
    ) {

resultCount.textContent =
    `${uniqueCards} cards`;
    }


    if (
        !visibleCards.length
    ) {

        container.innerHTML =
            `
            <div class="no-results">
                No cards found.
            </div>
            `;

        return;
    }


    visibleCards.forEach(
        ({
            card,
            artwork
        }) => {

            const copies =
                copyCount(
                    card.id
                );


            const disabled =
                deck.length >=
                    CONFIG.DECK_SIZE ||
                copies >=
                    CONFIG.COPY_LIMIT;


            const element =
                document.createElement(
                    "article"
                );


            element.className =
                "card-result";


            element.innerHTML = `

                <button
                    class="card-picture-button"
                    data-action="preview"
                    data-card-id="${escapeHtml(card.id)}"
                    data-artwork-id="${escapeHtml(artwork.id)}"
                    title="${escapeHtml(card.name)}"
                    type="button"
                >

<img
    class="card-picture"
    loading="lazy"
    decoding="async"
    alt="${escapeHtml(card.name)}"
>

                </button>


                <div class="card-info">

                    <div
                        class="card-name"
                        title="${escapeHtml(card.name)}"
                    >
                        ${escapeHtml(card.name)}
                    </div>


                    ${
                        artwork.id !==
                        "standard"

                            ? `
                                <div class="artwork-name">
                                    ${escapeHtml(artwork.name)}
                                </div>
                              `

                            : ""
                    }


                    <div class="card-meta">

                        L${card.level}
                        ·
                        ${escapeHtml(
                            displayCategory(
                                card
                            )
                        )}

                    </div>


                    <div class="card-buttons">

                        <button
                            class="add-button"
                            data-action="add"
                            data-card-id="${escapeHtml(card.id)}"
                            data-artwork-id="${escapeHtml(artwork.id)}"
                            type="button"
                            ${disabled ? "disabled" : ""}
                        >
                            + Add
                        </button>

                    </div>


                    <div class="copy-count">
                        ${copies}/${CONFIG.COPY_LIMIT}
                    </div>

                </div>
            `;


            applyImageCandidates(
                element.querySelector(
                    "img"
                ),
                artwork.images
            );


            container.appendChild(
                element
            );
        }
    );
}


/* =========================================================
   ADD TO DECK
   ========================================================= */

function addToDeck(
    cardId,
    artworkId
) {

    if (
        deck.length >=
        CONFIG.DECK_SIZE
    ) {

        return;
    }


    if (
        copyCount(
            cardId
        ) >=
        CONFIG.COPY_LIMIT
    ) {

        return;
    }


    const card =
        findCard(
            cardId
        );


    const artwork =
        findArtwork(
            card,
            artworkId
        );


    if (
        !card ||
        !artwork
    ) {

        return;
    }


    deck.push({

        cardId:
            card.id,

        artworkId:
            artwork.id
    });


    saveDeck();

    renderDeck();

    renderCardPool();

    updateDeckStats();


    if (
        $("#previewModal")
            ?.classList
            .contains(
                "open"
            )
    ) {

        renderPreview();
    }
}


/* =========================================================
   REMOVE FROM DECK
   ========================================================= */

function removeFromDeck(
    index
) {

    if (
        index <
            0 ||
        index >=
            deck.length
    ) {

        return;
    }


    deck.splice(
        index,
        1
    );


    saveDeck();

    renderDeck();

    renderCardPool();

    updateDeckStats();


    if (
        $("#previewModal")
            ?.classList
            .contains(
                "open"
            )
    ) {

        renderPreview();
    }
}


/* =========================================================
   RENDER DECK
   ========================================================= */

function renderDeck() {

    const container =
        $("#deckGrid");


    if (!container) {

        return;
    }


    container.innerHTML =
        "";


    for (
        let index = 0;
        index <
        CONFIG.DECK_SIZE;
        index++
    ) {

        const entry =
            deck[
                index
            ];


        const slot =
            document.createElement(
                "div"
            );


        slot.className =
            "deck-slot";


        if (!entry) {

            slot.innerHTML =
                `<span>${index + 1}</span>`;


            container.appendChild(
                slot
            );


            continue;
        }


        const card =
            findCard(
                entry.cardId
            );


        const artwork =
            findArtwork(
                card,
                entry.artworkId
            );


        if (
            !card ||
            !artwork
        ) {

            slot.textContent =
                "Missing";


            container.appendChild(
                slot
            );


            continue;
        }


        slot.classList.add(
            "filled"
        );


        slot.innerHTML = `

            <button
                class="deck-card"
                data-action="preview"
                data-card-id="${escapeHtml(card.id)}"
                data-artwork-id="${escapeHtml(artwork.id)}"
                title="${escapeHtml(card.name)}"
                type="button"
            >

                <img
                    alt="${escapeHtml(card.name)}"
                >

            </button>


            <button
                class="remove-card"
                data-action="remove"
                data-deck-index="${index}"
                title="Remove"
                type="button"
            >
                ×
            </button>
        `;


        applyImageCandidates(
            slot.querySelector(
                "img"
            ),
            artwork.images
        );


        container.appendChild(
            slot
        );
    }


    const deckCount =
        $("#deckCount");


    if (
        deckCount
    ) {

        deckCount.textContent =
            `${deck.length} / ${CONFIG.DECK_SIZE}`;
    }
}


/* =========================================================
   DECK STATS
   ========================================================= */

function updateDeckStats() {

    const levels = {

        1: 0,

        2: 0,

        3: 0,

        4: 0
    };


    const types = {

        Monster: 0,

        Spell: 0,

        Trap: 0
    };


    deck.forEach(
        entry => {

            const card =
                findCard(
                    entry.cardId
                );


            if (!card) {

                return;
            }


            if (
                levels[
                    card.level
                ] !==
                undefined
            ) {

                levels[
                    card.level
                ]++;
            }


            const type =
                displayCategory(
                    card
                );


            if (
                types[
                    type
                ] !==
                undefined
            ) {

                types[
                    type
                ]++;
            }
        }
    );


    const stats =
        $("#deckStats");


    if (!stats) {

        return;
    }


    stats.innerHTML = `

        <div>

            <strong>
                Levels:
            </strong>

            L1 ${levels[1]}
            ·
            L2 ${levels[2]}
            ·
            L3 ${levels[3]}
            ·
            L4 ${levels[4]}

        </div>


        <div>

            <strong>
                Card Types:
            </strong>

            Monsters ${types.Monster}
            ·
            Spells ${types.Spell}
            ·
            Traps ${types.Trap}

        </div>
    `;
}


/* =========================================================
   PREVIEW
   ========================================================= */

function openPreview(
    cardId,
    artworkId
) {

    const card =
        findCard(
            cardId
        );


    const artwork =
        findArtwork(
            card,
            artworkId
        );


    if (
        !card ||
        !artwork
    ) {

        return;
    }


    previewState = {

        cardId:
            card.id,

        artworkId:
            artwork.id
    };


    const modal =
        $("#previewModal");


    if (!modal) {

        console.error(
            "Preview modal not found."
        );

        return;
    }


    modal.classList.add(
        "open"
    );


    modal.setAttribute(
        "aria-hidden",
        "false"
    );


    renderPreview();
}


function renderPreview() {

    const card =
        findCard(
            previewState.cardId
        );


    const artwork =
        findArtwork(
            card,
            previewState.artworkId
        );


    if (
        !card ||
        !artwork
    ) {

        return;
    }


    applyImageCandidates(
        $("#previewFrontImage"),
        artwork.images
    );


    applyImageCandidates(
        $("#previewBackImage"),
        card.backImages
    );


    const addButton =
        $("#previewAddButton");


    if (
        addButton
    ) {

        addButton.disabled =

            deck.length >=
                CONFIG.DECK_SIZE ||

            copyCount(
                card.id
            ) >=
                CONFIG.COPY_LIMIT;
    }


    const disableArrows =
        visibleCards.length <=
        1;


    const prevButton =
        $("#previewPrevButton");


    const nextButton =
        $("#previewNextButton");


    if (
        prevButton
    ) {

        prevButton.disabled =
            disableArrows;
    }


    if (
        nextButton
    ) {

        nextButton.disabled =
            disableArrows;
    }
}


function getPreviewIndex() {

    return visibleCards.findIndex(
        result =>

            String(
                result.card.id
            ) ===
                String(
                    previewState.cardId
                ) &&

            String(
                result.artwork.id
            ) ===
                String(
                    previewState.artworkId
                )
    );
}


function movePreview(
    direction
) {

    if (
        !visibleCards.length
    ) {

        return;
    }


    let index =
        getPreviewIndex();


    if (
        index ===
        -1
    ) {

        index =
            0;

    } else {

        index =
            (
                index +
                direction +
                visibleCards.length
            ) %
            visibleCards.length;
    }


    const result =
        visibleCards[
            index
        ];


    previewState.cardId =
        result.card.id;


    previewState.artworkId =
        result.artwork.id;


    renderPreview();
}


function closePreview() {

    const modal =
        $("#previewModal");


    if (!modal) {

        return;
    }


    modal.classList.remove(
        "open"
    );


    modal.setAttribute(
        "aria-hidden",
        "true"
    );
}


/* =========================================================
   LOCAL STORAGE
   ========================================================= */

function saveDeck() {

    try {

        localStorage.setItem(

            CONFIG.STORAGE_KEY,

            JSON.stringify(
                deck
            )
        );

    } catch (
        error
    ) {

        console.warn(
            "Could not save deck:",
            error
        );
    }
}


function loadDeck() {

    try {

        const raw =
            localStorage.getItem(
                CONFIG.STORAGE_KEY
            );


        deck =
            raw

                ? JSON.parse(
                    raw
                )

                : [];


        if (
            !Array.isArray(
                deck
            )
        ) {

            deck = [];
        }


    } catch {

        deck = [];
    }


    deck =
        deck
            .map(
                entry => ({

                    cardId:
                        String(
                            entry.cardId
                        ),

                    artworkId:
                        String(
                            entry.artworkId ??
                            "standard"
                        )
                })
            )
            .filter(
                entry => {

                    const card =
                        findCard(
                            entry.cardId
                        );


                    return (
                        card &&
                        findArtwork(
                            card,
                            entry.artworkId
                        )
                    );
                }
            );


    deck =
        deck.slice(
            0,
            CONFIG.DECK_SIZE
        );


    const counts =
        new Map();


    deck =
        deck.filter(
            entry => {

                const current =
                    (
                        counts.get(
                            entry.cardId
                        ) ??
                        0
                    ) + 1;


                counts.set(
                    entry.cardId,
                    current
                );


                return (
                    current <=
                    CONFIG.COPY_LIMIT
                );
            }
        );


    renderDeck();

    updateDeckStats();
}


/* =========================================================
   RESET FILTERS
   ========================================================= */

function resetFilters() {

    const search =
        $("#searchInput");


    if (
        search
    ) {

        search.value =
            "";
    }


    const effect =
        $("#effectSearch");


    if (
        effect
    ) {

        effect.value =
            "";
    }


    $$(
        "input[name='category']"
    )
        .forEach(
            input =>
                input.checked =
                    false
        );


    $$(
        "input[name='level']"
    )
        .forEach(
            input =>
                input.checked =
                    false
        );


    const monsterType =
        $("#monsterTypeFilter");


    if (
        monsterType
    ) {

        monsterType.value =
            "";
    }


    const itemSubtype =
        $("#itemSubtypeFilter");


    if (
        itemSubtype
    ) {

        itemSubtype.value =
            "";
    }


    const keyword =
        $("#keywordFilter");


    if (
        keyword
    ) {

        keyword.value =
            "";
    }


    const sort =
        $("#sortFilter");


    if (
        sort
    ) {

        sort.value =
            "name-asc";
    }


    [
        "hp",
        "atk",
        "def"
    ]
        .forEach(
            stat => {

                const operator =
                    $(`#${stat}Operator`);


                const value =
                    $(`#${stat}Value`);


                if (
                    operator
                ) {

                    operator.value =
                        "";
                }


                if (
                    value
                ) {

                    value.value =
                        "";
                }
            }
        );


    $$(
        "[data-crest-checkbox]"
    )
        .forEach(
            checkbox =>
                checkbox.checked =
                    false
        );


    $$(
        "[data-crest-min]"
    )
        .forEach(
            input =>
                input.value =
                    "1"
        );


    const all =
        document.querySelector(
            "input[name='crestMatch'][value='all']"
        );


    if (
        all
    ) {

        all.checked =
            true;
    }


    applyFilters();
}


/* =========================================================
   MORE FILTERS
   ========================================================= */

function toggleAdvancedFilters() {

    const advanced =
        $("#advancedFilters");


    const button =
        $("#moreFiltersButton");


    if (
        !advanced ||
        !button
    ) {

        return;
    }


    const open =
        advanced.classList.toggle(
            "open"
        );


    button.classList.toggle(
        "active",
        open
    );


    button.textContent =
        open

            ? "Less ▴"

            : "More ▾";
}


/* =========================================================
   CLICK EVENTS
   ========================================================= */

document.addEventListener(
    "click",
    event => {

        const target =
            event.target.closest(
                "[data-action]"
            );


        if (!target) {

            return;
        }


        switch (
            target.dataset.action
        ) {

            case "add":

                addToDeck(
                    target.dataset.cardId,
                    target.dataset.artworkId
                );

                break;


            case "remove":

                removeFromDeck(
                    Number(
                        target.dataset.deckIndex
                    )
                );

                break;


            case "preview":

                openPreview(
                    target.dataset.cardId,
                    target.dataset.artworkId
                );

                break;


            case "preview-prev":

                movePreview(
                    -1
                );

                break;


            case "preview-next":

                movePreview(
                    1
                );

                break;


            case "close-preview":

                closePreview();

                break;


            case "preview-add":

                addToDeck(
                    previewState.cardId,
                    previewState.artworkId
                );

                renderPreview();

                break;
        }
    }
);


/* =========================================================
   FILTER EVENTS
   ========================================================= */

function filterChanged(
    event
) {

    if (
        event.target.closest(
            ".compact-search-panel"
        )
    ) {

        applyFilters();
    }
}


document.addEventListener(
    "input",
    filterChanged
);


document.addEventListener(
    "change",
    filterChanged
);


/* =========================================================
   STATIC BUTTONS
   ========================================================= */

$("#resetFiltersButton")
    ?.addEventListener(
        "click",
        resetFilters
    );


$("#moreFiltersButton")
    ?.addEventListener(
        "click",
        toggleAdvancedFilters
    );


/* =========================================================
   KEYBOARD PREVIEW CONTROLS
   ========================================================= */

document.addEventListener(
    "keydown",
    event => {

        const modal =
            $("#previewModal");


        const previewOpen =
            modal
                ?.classList
                .contains(
                    "open"
                ) ??
            false;


        if (
            event.key ===
            "Escape"
        ) {

            if (
                previewOpen
            ) {

                closePreview();
            }

            return;
        }


        if (
            !previewOpen
        ) {

            return;
        }


        if (
            event.key ===
            "ArrowLeft"
        ) {

            event.preventDefault();

            movePreview(
                -1
            );
        }


        if (
            event.key ===
            "ArrowRight"
        ) {

            event.preventDefault();

            movePreview(
                1
            );
        }
    }
);


/* =========================================================
   EXPOSE FOR DEBUGGING
   ========================================================= */

window.DDMDeckBuilder = {

    get cards() {

        return cards;
    },

    get visibleCards() {

        return visibleCards;
    },

    get deck() {

        return deck;
    },

    addToDeck,

    removeFromDeck,

    applyFilters,

    resetFilters,

    openPreview,

    closePreview,

    movePreview
};


/* =========================================================
   START
   ========================================================= */

loadCards();