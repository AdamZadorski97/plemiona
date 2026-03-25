/*
    Asystent Zbieracza z GUI i Ustawieniami v3.3
    Poprawione: Ignorowanie ZABLOKOWANYCH i AKTUALNIE ZAJĘTYCH poziomów.
*/

(function() {
    // Sprawdzenie czy jesteśmy na właściwej stronie
    if (window.location.href.indexOf('screen=place') === -1 || window.location.href.indexOf('mode=scavenge') === -1) {
        UI.InfoMessage('Skrypt działa tylko w placu w zakładce zbieractwo!', 3000, 'error');
        return;
    }

    // Zamknięcie okna jeśli już istnieje (toggle)
    if (document.getElementById('scavenge_gui_window')) {
        document.getElementById('scavenge_gui_window').remove();
        return;
    }

    const units = ['spear', 'sword', 'axe', 'archer', 'light', 'marcher', 'heavy'];
    const unitNames = {spear: 'Pikinier', sword: 'Miecznik', axe: 'Topornik', archer: 'Łucznik', light: 'Lekka', marcher: 'Łucz. konny', heavy: 'Ciężka'};
    const unitsCapacity = {spear: 25, sword: 15, axe: 10, archer: 10, light: 80, marcher: 50, heavy: 50};

    // Domyślne ustawienia
    let defaultSettings = {
        global: { archers: 1, skip_level_1: 0, max_ressources: 999999 },
        units: {}
    };
    units.forEach(u => defaultSettings.units[u] = { untouchable: 0, max: 99999 });

    // Wczytywanie ustawień z localStorage
    let saved = localStorage.getItem('TW_Scavenge_Settings_v3');
    let settings = saved ? JSON.parse(saved) : defaultSettings;

    // Zabezpieczenie brakujących kluczy przy aktualizacji
    if (typeof settings.global.max_ressources === 'undefined') settings.global.max_ressources = 999999;
    units.forEach(u => {
        if (!settings.units[u]) settings.units[u] = { untouchable: 0, max: 99999 };
    });

    // Główna funkcja budująca interfejs
    function renderUI() {
        let html = `
            <div id="scavenge_gui_window" style="position:fixed; top:80px; right:20px; width: 320px; background:#e3d5b3; border:2px solid #7d510f; padding:12px; z-index:99999; border-radius:8px; box-shadow: 0px 4px 10px rgba(0,0,0,0.5); font-family: Verdana, Arial; max-height: 85vh; overflow-y: auto;">
                
                <div style="display:flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #7d510f; padding-bottom: 5px; margin-bottom: 10px;">
                    <h3 style="margin:0; font-size: 14px; color: #402000;">Asystent Zbieracza</h3>
                    <button id="scav_close" style="background:none; border:none; font-size:20px; cursor:pointer; font-weight:bold; color: #7d510f; line-height:1;">&times;</button>
                </div>
                
                <div style="font-size: 11px; margin-bottom: 10px; background: #f4e4c1; padding: 5px; border: 1px solid #c1a264; border-radius: 4px;">
                    <strong>Ustawienia Globalne:</strong><br>
                    <label style="cursor:pointer; display:block; margin-top:3px;"><input type="checkbox" id="scav_archers" ${settings.global.archers ? 'checked' : ''}> Gramy z łucznikami (Świat z łukami)</label>
                    <label style="cursor:pointer; display:block; margin-top:3px;"><input type="checkbox" id="scav_skip_1" ${settings.global.skip_level_1 ? 'checked' : ''}> Pomiń poziom 1 (Leniwe zbieractwo)</label>
                    <label style="display:block; margin-top:3px;">Max sur. z jednego poziomu: <br><input type="number" id="scav_max_res" value="${settings.global.max_ressources}" style="width:80px; padding:2px; font-size:10px; margin-top:2px;"></label>
                </div>

                <div style="font-size: 11px; margin-bottom: 10px;">
                    <strong>Limity Jednostek:</strong>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 5px; font-size:10px;">
                        <tr style="background: #c1a264;">
                            <th style="padding: 4px; text-align:left;">Jednostka</th>
                            <th style="padding: 4px; text-align:center;" title="Ile sztuk ma zawsze zostać w wiosce?">Zostaw</th>
                            <th style="padding: 4px; text-align:center;" title="Maksymalnie ile sztuk wyślesz w sumie?">Max wyślij</th>
                        </tr>
        `;

        units.forEach(unit => {
            if (!settings.global.archers && (unit === 'archer' || unit === 'marcher')) return;
            html += `
                <tr style="border-bottom: 1px solid #c1a264;">
                    <td style="padding: 4px;"><b>${unitNames[unit]}</b></td>
                    <td style="text-align:center;"><input type="number" class="scav_u_untouchable" data-unit="${unit}" value="${settings.units[unit].untouchable}" style="width:50px; font-size:10px; text-align:center;"></td>
                    <td style="text-align:center;"><input type="number" class="scav_u_max" data-unit="${unit}" value="${settings.units[unit].max}" style="width:50px; font-size:10px; text-align:center;"></td>
                </tr>
            `;
        });

        html += `
                    </table>
                    <button id="scav_save_settings" class="btn" style="width: 100%; margin-top: 8px; padding: 5px; font-size:11px;">Zapisz i Przelicz</button>
                </div>
                <hr style="border-color:#c1a264; margin: 10px 0;">
                
                <div id="scav_action_area" style="font-size: 11px;">
                    </div>
            </div>
        `;

        $('body').append(html);
        
        $('#scav_close').click(function() { $('#scavenge_gui_window').remove(); });
        $('#scav_save_settings').click(saveSettings);
        
        $('#scav_archers').change(function() {
            saveSettings(false);
            $('#scavenge_gui_window').remove();
            renderUI();
        });

        calculateAndRenderActions();
    }

    function saveSettings(showMessage = true) {
        settings.global.archers = $('#scav_archers').is(':checked') ? 1 : 0;
        settings.global.skip_level_1 = $('#scav_skip_1').is(':checked') ? 1 : 0;
        settings.global.max_ressources = parseInt($('#scav_max_res').val()) || 999999;

        $('.scav_u_untouchable').each(function() {
            settings.units[$(this).data('unit')].untouchable = parseInt($(this).val()) || 0;
        });
        $('.scav_u_max').each(function() {
            settings.units[$(this).data('unit')].max = parseInt($(this).val()) || 99999;
        });

        localStorage.setItem('TW_Scavenge_Settings_v3', JSON.stringify(settings));
        
        if (showMessage) {
            UI.SuccessMessage('Ustawienia zapisane!', 2000);
            calculateAndRenderActions();
        }
    }

    function calculateAndRenderActions() {
        let availableUnits = {};
        let totalUsableUnits = 0;

        units.forEach(unit => {
            if (settings.global.archers === 0 && (unit === 'archer' || unit === 'marcher')) {
                availableUnits[unit] = 0;
                return;
            }

            let field = $(`[name=${unit}]`);
            if (field.length > 0 && field[0].parentNode.children[1]) {
                let match = field[0].parentNode.children[1].innerText.match(/\d+/);
                let available = match ? parseInt(match[0]) : 0;
                
                let uSet = settings.units[unit];
                if (available > uSet.untouchable) available -= uSet.untouchable;
                else available = 0;
                
                if (available > uSet.max) available = uSet.max;

                availableUnits[unit] = available;
                totalUsableUnits += available;
            } else {
                availableUnits[unit] = 0;
            }
        });

        // WYKRYWANIE PRAWIDŁOWYCH POZIOMÓW BEZPOŚREDNIO Z GRY
        let availableLevels = [];

        if (typeof window.ScavengeScreen !== 'undefined' && window.ScavengeScreen.village && window.ScavengeScreen.village.options) {
            let opts = window.ScavengeScreen.village.options;
            Object.values(opts).forEach(opt => {
                // Jeśli poziom jest zbadany (nie is_locked) i nie wędrują już do niego wojska (nie scavenging_in_progress)
                if (opt.is_locked === false && opt.scavenging_in_progress === false) {
                    availableLevels.push(opt.base.id - 1); // Zapisujemy indeks: 0, 1, 2, lub 3
                }
            });
        } else {
            // W razie braku nowszych funkcji po stronie Plemion, fallback na starą metodę (szuka przycisku)
            $('.scavenge-option').each(function(index) {
                if ($(this).find('.free_send_button').length > 0) {
                    availableLevels.push(index);
                }
            });
        }
        
        // Upewniamy się, że lecimy od najmniejszego poziomu do największego
        availableLevels.sort((a, b) => a - b);

        // Odrzucamy 1. poziom, o ile jest polecenie "Pomiń Leniwe" i mamy jakikolwiek inny poziom
        if (settings.global.skip_level_1 === 1 && availableLevels.includes(0) && availableLevels.length > 1) {
            availableLevels = availableLevels.filter(lvl => lvl !== 0);
        }

        let html = `<strong>Gotowe do drogi (po cięciach):</strong><br><ul style="list-style-type:none; padding-left:0; margin: 5px 0;">`;
        if (totalUsableUnits === 0) {
            html += `<li><i>Brak wojsk (lub blokują je ustawienia).</i></li>`;
        } else {
            units.forEach(unit => {
                if(availableUnits[unit] > 0) {
                    html += `<li style="display:inline-block; margin-right:10px;"><img src="${window.image_base}unit/unit_${unit}.png" style="width:14px; height:14px; vertical-align:middle;"> <b>${availableUnits[unit]}</b></li>`;
                }
            });
        }
        html += `</ul>`;

        if (availableLevels.length === 0) {
            html += `<div style="color:red; font-weight:bold; font-size: 12px; text-align:center; padding: 10px 0;">Brak wolnych poziomów!</div>`;
            $('#scav_action_area').html(html);
        } else {
            let packs = [15, 6, 3, 2];
            let levelNames = ["Leniwe (1)", "Skromne (2)", "Sprytne (3)", "Wielkie (4)"];
            let activeWeights = [];
            
            availableLevels.forEach(lvlIndex => {
                activeWeights.push({ weight: packs[lvlIndex], name: levelNames[lvlIndex] });
            });
            
            let currentTotalWeight = activeWeights.reduce((a, b) => a + b.weight, 0);

            html += `<div style="margin-top: 10px;"><strong>Rozdziel (Równy czas):</strong></div>`;
            activeWeights.forEach((lvl) => {
                html += `
                    <div style="border:1px solid #c1a264; padding:5px; margin-bottom:5px; background:#f4e4c1; border-radius:4px;">
                        <button class="btn fill-level-btn" data-weight="${lvl.weight}" style="width:100%; padding:6px; font-size:11px; font-weight:bold; cursor:pointer;">
                            Wypełnij: ${lvl.name}
                        </button>
                    </div>
                `;
            });

            $('#scav_action_area').html(html);

            function fillInput(unit, number) {
                let field = $(`[name=${unit}]`);
                if(field.length > 0) {
                    field.trigger('focus').trigger('keydown').val(number).trigger('keyup').trigger('change').blur();
                }
            }

            let dynamicWeight = currentTotalWeight;

            $('.fill-level-btn').off('click').on('click', function() {
                let w = parseFloat($(this).attr('data-weight'));
                let ratio = w / dynamicWeight;
                
                let assignedAmounts = {};
                let currentCapacity = 0;

                units.forEach(unit => {
                    if (availableUnits[unit] > 0) {
                        let amount = Math.round(availableUnits[unit] * ratio);
                        assignedAmounts[unit] = amount;
                        currentCapacity += amount * unitsCapacity[unit];
                    } else {
                        assignedAmounts[unit] = 0;
                    }
                });

                let maxRes = settings.global.max_ressources;
                if (maxRes > 0 && currentCapacity > maxRes) {
                    let capRatio = maxRes / currentCapacity;
                    units.forEach(unit => {
                        assignedAmounts[unit] = Math.floor(assignedAmounts[unit] * capRatio);
                    });
                }
                
                units.forEach(unit => {
                    fillInput(unit, assignedAmounts[unit]);
                    availableUnits[unit] -= assignedAmounts[unit]; 
                });
                
                dynamicWeight -= w; 
                $(this).parent().fadeOut(200);
            });
        }
    }

    renderUI();

})();
