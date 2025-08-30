// ======================================================
//        ARCHIVO: Code.gs (CON @CLIENTE DEMO POR DEFECTO)
// ======================================================

// --- IDs de Hojas de cálculo ---
const SPREADSHEET_ID_PRINCIPAL = '1PYUV-z5-FSJ19HgYH9BI5JO4wRHBQbnetxM9bswjJY8';
const SPREADSHEET_ID_PERMISOS = '16ZwoMXrNqYONetPME-2hb1dhhn826BDthO1AXUiFJUs';
const SPREADSHEET_ID_APPS_ASIGNADAS = '1-gyvb6fagOm9kA11ye1PKzPUG4nx3AQw4-pftTMsPD0';

/**
 * Función principal para servir la aplicación web.
 */
function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('Pulso')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setFaviconUrl('https://www.appsheet.com/template/gettablefileurl?appName=APPFOTOS-6147552&tableName=FOTO&fileName=FOTO_Images%2Ff0b05aac.FOTOGRAFIA.153703.png');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getInicioHtml() {
  return HtmlService.createHtmlOutputFromFile('InicioView').getContent();
}

function getInitialData() {
  const userEmail = Session.getEffectiveUser().getEmail();
  try {
    // --- LECTURA DE HOJAS DE CÁLCULO ---
    const ssPermisos = SpreadsheetApp.openById(SPREADSHEET_ID_PERMISOS);
    const permisosPerfilSheet = ssPermisos.getSheetByName('PermisosPerfil');
    if (!permisosPerfilSheet) throw new Error("La pestaña 'PermisosPerfil' no se encontró en la hoja de Permisos.");
    const permisosClienteSheet = ssPermisos.getSheetByName('PermisosCliente');
    if (!permisosClienteSheet) throw new Error("La pestaña 'PermisosCliente' no se encontró en la hoja de Permisos.");
    const customersSheet = ssPermisos.getSheetByName('CUSTOMERS');
    if (!customersSheet) throw new Error("La pestaña 'CUSTOMERS' no se encontró en la hoja de Permisos.");

    const ssPrincipal = SpreadsheetApp.openById(SPREADSHEET_ID_PRINCIPAL);
    const appsSheet = ssPrincipal.getSheetByName('Apps');
    if (!appsSheet) throw new Error("La pestaña 'Apps' no se encontró en la hoja Principal.");
    const panelesSheet = ssPrincipal.getSheetByName('Paneles');
    if (!panelesSheet) throw new Error("La pestaña 'Paneles' no se encontró en la hoja Principal.");
    
    const ssAppsAsignadas = SpreadsheetApp.openById(SPREADSHEET_ID_APPS_ASIGNADAS);
    const customerAssignedSheet = ssAppsAsignadas.getSheetByName('customerAssigned');
    if (!customerAssignedSheet) throw new Error("La pestaña 'customerAssigned' no se encontró en la hoja de Apps Asignadas.");

    const permisosPerfilData = permisosPerfilSheet.getDataRange().getValues();
    const permisosClienteData = permisosClienteSheet.getDataRange().getValues();
    const customersData = customersSheet.getDataRange().getValues();
    const appsData = appsSheet.getDataRange().getValues();
    const panelesData = panelesSheet.getDataRange().getValues();
    const customerAssignedData = customerAssignedSheet.getDataRange().getValues();

    // --- LÓGICA DE PERMISOS ---
    const perfilRow = permisosPerfilData.find(row => row && row.length > 3 && row[3] === userEmail);
    if (!perfilRow) {
      // Si el usuario no está registrado, se le da acceso DEMO
      const clienteDemo = { id: "demo", name: "@Cliente Demo" };
      return {
        userEmail: userEmail,
        apps: [],
        paneles: [],
        clientes: [clienteDemo],
        sites: [], // Devuelve una lista de sitios vacía para el usuario demo/invitado
        urlDashboardApps: "https://lookerstudio.google.com/embed/reporting/affbb0f2-73e6-4642-aa1c-934ae295454f/page/puJRF",
        urlClienteDashboardBase: "https://lookerstudio.google.com/embed/reporting/e392f503-7bcd-49b4-b3b4-7633df82e479/page/puJRF"
      };
    }

    const perfil = perfilRow[1];
    const customerNameMap = new Map();
    customersData.slice(1).forEach(row => { if (row && row[0]) customerNameMap.set(String(row[0]), row[1]); });
    
    const clientesConDuplicados = permisosClienteData.slice(1).filter(row => row && row.length > 2 && row[2] === perfil).map(row => {
      const customerId = String(row[1]);
      return { id: customerId, name: customerNameMap.get(customerId) || customerId };
    });
    const clientesUnicosMap = new Map();
    clientesConDuplicados.forEach(cliente => clientesUnicosMap.set(cliente.id, cliente));
    const clientesUsuario = Array.from(clientesUnicosMap.values());
    const clienteDemo = { id: "demo", name: "@Cliente Demo" };
    const clientes = [clienteDemo, ...clientesUsuario];
    const clientesRealesIdSet = new Set(clientesUsuario.map(c => c.id));
    
    // =======================================================
    // INICIO DE LA CORRECCIÓN: Cargar sitios desde el principio
    // =======================================================
    // Obtenemos los IDs de todos los clientes reales a los que el usuario tiene acceso
    const clientIdsForInitialSites = Array.from(clientesRealesIdSet);
    // Reutilizamos la función que ya creamos para obtener todos los sitios de esos clientes
    const initialSites = getSitesForClient(clientIdsForInitialSites);
    // =======================================================
    // FIN DE LA CORRECCIÓN
    // =======================================================
    
    const appsDisponibles = new Set(customerAssignedData.slice(1).filter(row => row && row.length > 2 && clientesRealesIdSet.has(String(row[2]))).map(row => String(row[1])));
    const apps = appsData.slice(1).filter(row => row && row.length > 1 && appsDisponibles.has(String(row[1]))).map(row => ({ Nombre: row[0], App: row[1], Imagen: row[2], Descripcion: row[3] }));
    const paneles = panelesData.slice(1).filter(row => row && row.length > 4 && row[4] !== "" && appsDisponibles.has(String(row[2]))).map(row => ({ Nombre: row[0], Looker: row[1], Numero: row[2], Descripcion: row[3] }));
    
    return {
      userEmail: userEmail,
      apps: apps,
      paneles: paneles,
      clientes: clientes,
      sites: initialSites, // <-- ENVIAR LA LISTA INICIAL DE SITIOS AL FRONTEND
      urlDashboardApps: "https://lookerstudio.google.com/embed/reporting/affbb0f2-73e6-4642-aa1c-934ae295454f/page/puJRF",
      urlClienteDashboardBase: "https://lookerstudio.google.com/embed/reporting/e392f503-7bcd-49b4-b3b4-7633df82e479/page/puJRF"
    };

  } catch (e) {
    Logger.log("Error FATAL en getInitialData: " + e.message + " Stack: " + e.stack);
    return { error: 'Error en el servidor: ' + e.message };
  }
}


function getDataForClient(selectedClient) {
  try {
    const userEmail = Session.getEffectiveUser().getEmail();
    
    const ssPermisos = SpreadsheetApp.openById(SPREADSHEET_ID_PERMISOS);
    const permisosPerfilData = ssPermisos.getSheetByName('PermisosPerfil').getDataRange().getValues();
    const permisosClienteData = ssPermisos.getSheetByName('PermisosCliente').getDataRange().getValues();
    
    const perfilRow = permisosPerfilData.find(row => row[3] === userEmail);
    if (!perfilRow) { throw new Error("Perfil de usuario no encontrado"); }
    const perfil = perfilRow[1];

    const allUserClients = permisosClienteData
      .slice(1)
      .filter(row => row[2] === perfil)
      .map(row => String(row[1]));

    let clientsToFilter = [];
    if (selectedClient === "Todos") {
      clientsToFilter = [...new Set(allUserClients)];
    } else if (allUserClients.includes(selectedClient)) {
      clientsToFilter = [selectedClient];
    } else {
      throw new Error("Acceso no autorizado al cliente seleccionado.");
    }

    const clientsToFilterSet = new Set(clientsToFilter);

    const ssAppsAsignadas = SpreadsheetApp.openById(SPREADSHEET_ID_APPS_ASIGNADAS);
    const customerAssignedData = ssAppsAsignadas.getSheetByName('customerAssigned').getDataRange().getValues();
    
    const appsDisponibles = new Set(
      customerAssignedData
        .slice(1)
        .filter(row => clientsToFilterSet.has(String(row[2])))
        .map(row => String(row[1]))
    );

    const ssPrincipal = SpreadsheetApp.openById(SPREADSHEET_ID_PRINCIPAL);
    const appsData = ssPrincipal.getSheetByName('Apps').getDataRange().getValues();
    const panelesData = ssPrincipal.getSheetByName('Paneles').getDataRange().getValues();

    const apps = appsData.slice(1).filter(row => appsDisponibles.has(String(row[1]))).map(row => ({
        Nombre: row[0], App: row[1], Imagen: row[2], Descripcion: row[3]
    }));
    const paneles = panelesData.slice(1).filter(row => row[4] !== "" && appsDisponibles.has(String(row[2]))).map(row => ({
        Nombre: row[0], Looker: row[1], Numero: row[2], Descripcion: row[3]
    }));

    return { apps, paneles };

  } catch (e) {
    Logger.log("Error en getDataForClient: " + e.message + " Stack: " + e.stack);
    return { error: e.message };
  }
}
  /**
 * Obtiene la lista de sitios para un cliente o un grupo de clientes.
 * @param {string[]} clientIds - Un array con los IDs de los clientes a buscar.
 * @returns {object[]} Un array de objetos, cada uno con { id, name }.
 */
  function getSitesForClient(clientIds) {
    try {
      if (!clientIds || clientIds.length === 0) {
        return []; // No hay clientes, no hay sitios.
      }
      
      const ssPermisos = SpreadsheetApp.openById(SPREADSHEET_ID_PERMISOS);
      const sitesSheet = ssPermisos.getSheetByName('SITES'); // Asegúrate que el nombre de la pestaña es SITES
      if (!sitesSheet) {
        throw new Error("La pestaña 'SITES' no se encontró en la hoja de Permisos.");
      }
      const sitesData = sitesSheet.getDataRange().getValues();
      
      const clientIdsSet = new Set(clientIds); // Para búsquedas rápidas

      const sites = sitesData
        .slice(1) // Omitir encabezado
        .filter(row => row && row.length > 5 && clientIdsSet.has(String(row[5]))) // Columna F (customerId)
        .map(row => ({
          id: String(row[0]),   // Columna A (siteId)
          name: String(row[1])  // Columna B (siteName)
        }));

      // Opcional: Ordenar alfabéticamente
      sites.sort((a, b) => a.name.localeCompare(b.name));
      
      return sites;

    } catch(e) {
      Logger.log("Error en getSitesForClient: " + e.message);
      return { error: e.message };
    }
  }
