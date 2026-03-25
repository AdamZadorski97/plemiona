javascript:
/*
    Asystent Zbieracza z GUI i Ustawieniami v3.4
    Bezstanowy silnik: zawsze dynamicznie wylicza najwyższy dostępny poziom (jak oryginał).
*/

(function() {
    if (window.location.href.indexOf('screen=place') === -1 || window.location.href.indexOf('mode=scavenge') === -1) {
        UI.InfoMessage('Skrypt działa tylko w placu w zakładce zbieractwo!', 3000, 'error');
        return;
    }

    if (document.getElementById('scavenge_gui_window')) {
        document.getElementById('scavenge_gui_window').remove();
        return;
    }

    const units = ['spear', 'sword', 'axe', 'archer', 'light', 'marcher', 'heavy'];
    const unitNames = {spear: 'Pikinier', sword: 'Miecznik', axe: 'Topornik', archer: 'Łucznik', light: 'Lekka', marcher: 'Łucz. konny', heavy: 'Ciężka'};
    const unitsCapacity = {spear: 25, sword: 15, axe: 10, archer: 10, light: 80, marcher: 50, heavy: 50};

    let defaultSettings = {
        global: { archers: 1, skip_level_1: 0, max_ressources: 999999 },
        units: {}
    };
    units.forEach(u => defaultSettings.units[u] = { untouchable: 0, max: 99999 });

    let saved = localStorage.getItem('TW_Scavenge_Settings_v3');
    let settings = saved ? JSON.parse(saved) : defaultSettings;

    if (typeof settings.global.max_ressources === 'undefined') settings.global.max_ressources = 999999;
    units.forEach(u => {
        if (!settings.units[u]) settings.units[u] = { untouchable: 0, max: 99999 };
    });

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
                    <button id="scav_save_settings" class="btn" style="width: 100%; margin-top: 8px; padding: 5px; font-size:11px;">Zapisz ustawienia</button>
                </div>
                <hr style="border-color:#c1a264; margin: 10px 0;">
                
                <div style="text-align:center; padding: 5px 0;">
                    <button id="scav_fill_highest" class="btn" style="width:100%; padding:10px; font-size:13px; font-weight:bold; cursor:pointer; background-color:#5c3a1b; color:white; border: 1px solid #402000; border-radius: 4px;">
                        Wypełnij: Najwyższy Wolny
                    </button>
                    <div style="font-size:9px; margin-top:6px; color:#7d510f;">
                        Wciśnij -> wyślij w grze -> wciśnij ponownie.
                    </div>
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

        $('#scav_fill_highest').click(fillOptimalLevel);
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
        }
    }

    function fillInput(unit, number) {
        let field = $(`[name=${unit}]`);
        if(field.length > 0) {
            field.trigger('focus').trigger('keydown').val(number).trigger('keyup').trigger('change').blur();
        }
    }

    function fillOptimalLevel() {
        let availableUnits = {};
        
        // Zczytujemy dostępne jednostki na świeżo z ekranu gry
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
            } else {
                availableUnits[unit] = 0;
            }
        });

        // Weryfikacja faktycznie wolnych poziomów z logiki Plemion
        let availableLevels = [];
        if (typeof window.ScavengeScreen !== 'undefined' && window.ScavengeScreen.village && window.ScavengeScreen.village.options) {
            let opts = window.ScavengeScreen.village.options;
            Object.values(opts).forEach(opt => {
                if (opt.is_locked === false && opt.scavenging_in_progress === false) {
                    availableLevels.push(opt.base.id - 1);
                }
            });
        } else {
            $('.scavenge-option').each(function(index) {
                if ($(this).find('.free_send_button').length > 0) {
                    availableLevels.push(index);
                }
            });
        }
        
        availableLevels.sort((a, b) => a - b);

        // Odrzucenie 1. poziomu z ustawień (z zabezpieczeniem jak w oryginale)
        if (settings.global.skip_level_1 === 1) {
            if (availableLevels.includes(0) && availableLevels.length > 1) {
                availableLevels = availableLevels.filter(lvl => lvl !== 0);
            } else if (availableLevels.length === 1 && availableLevels[0] === 0) {
                UI.ErrorMessage('Został tylko 1 poziom, a w ustawieniach kazałeś go pomijać.', 3000);
                return;
            }
        }

        if (availableLevels.length === 0) {
            UI.ErrorMessage('Brak wolnych poziomów!', 2000);
            return;
        }

        // Kalkulacja proporcji (dokładnie jak w oryginale dla równego czasu)
        let packs = [15, 6, 3, 2];
        let totalWeight = availableLevels.reduce((sum, lvl) => sum + packs[lvl], 0);
        let targetLvl = availableLevels[availableLevels.length - 1]; // Wybieramy najwyższy możliwy
        let weight = packs[targetLvl];
        let ratio = weight / totalWeight;

        let assignedAmounts = {};
        let currentCapacity = 0;

        units.forEach(unit => {
            if (availableUnits[unit] > 0) {
                // Jeśli to ostatni poziom w kolejce, bierzemy po prostu 100% tego co jest, żeby uniknąć gubienia resztek w ułamkach
                let amount = (availableLevels.length === 1) ? availableUnits[unit] : Math.round(availableUnits[unit] * ratio);
                assignedAmounts[unit] = amount;
                currentCapacity += amount * unitsCapacity[unit];
            } else {
                assignedAmounts[unit] = 0;
            }
        });

        // Ewentualne cięcie pod max_ressources
        let maxRes = settings.global.max_ressources;
        if (maxRes > 0 && currentCapacity > maxRes) {
            let capRatio = maxRes / currentCapacity;
            units.forEach(unit => {
                assignedAmounts[unit] = Math.floor(assignedAmounts[unit] * capRatio);
            });
        }
        
        units.forEach(unit => { fillInput(unit, assignedAmounts[unit]); });
        
        UI.SuccessMessage(`Przygotowano: Poziom ${targetLvl + 1}`, 1500);
    }

    renderUI();

})();
