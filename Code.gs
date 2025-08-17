// ======================================================
//        ARCHIVO: Code.gs (CON NOMBRES DE CLIENTE)
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

/**
 * Función para incluir otros archivos HTML en la plantilla principal.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Devuelve el contenido HTML de la página de inicio.
 */
function getInicioHtml() {
  return HtmlService.createHtmlOutputFromFile('InicioView').getContent();
}


/**
 * Obtiene los datos iniciales. AHORA DEVUELVE OBJETOS DE CLIENTE {id, name}.
 */
function getInitialData() {
  const userEmail = Session.getEffectiveUser().getEmail();
  
  try {
    const ssPermisos = SpreadsheetApp.openById(SPREADSHEET_ID_PERMISOS);
    const permisosPerfilData = ssPermisos.getSheetByName('PermisosPerfil').getDataRange().getValues();
    const permisosClienteData = ssPermisos.getSheetByName('PermisosCliente').getDataRange().getValues();
    
    // Leer la hoja CUSTOMERS para obtener los nombres
    const customersSheet = ssPermisos.getSheetByName('CUSTOMERS');
    const customersData = customersSheet.getDataRange().getValues();

    // Crear un mapa de búsqueda para eficiencia: { customerId -> customerName }
    const customerNameMap = new Map();
    customersData.slice(1).forEach(row => {
      const customerId = String(row[0]); // Columna A
      const customerName = row[1];       // Columna B
      if (customerId && customerName) {
        customerNameMap.set(customerId, customerName);
      }
    });

    const ssPrincipal = SpreadsheetApp.openById(SPREADSHEET_ID_PRINCIPAL);
    const appsData = ssPrincipal.getSheetByName('Apps').getDataRange().getValues();
    const panelesData = ssPrincipal.getSheetByName('Paneles').getDataRange().getValues();
    
    const ssAppsAsignadas = SpreadsheetApp.openById(SPREADSHEET_ID_APPS_ASIGNADAS);
    const customerAssignedData = ssAppsAsignadas.getSheetByName('customerAssigned').getDataRange().getValues();

    const perfilRow = permisosPerfilData.find(row => row[3] === userEmail);
    if (!perfilRow) {
      return { error: 'Perfil no encontrado para el usuario: ' + userEmail };
    }
    const perfil = perfilRow[1];

    // Construir la lista de objetos de cliente {id, name}
    const clientes = permisosClienteData
      .slice(1)
      .filter(row => row[2] === perfil)
      .map(row => {
        const customerId = String(row[1]);
        return {
          id: customerId,
          name: customerNameMap.get(customerId) || customerId // Usa el nombre del mapa, o el ID si no se encuentra
        };
      });

    if (clientes.length === 0) {
      return { error: 'No se encontraron clientes asignados para el perfil: ' + perfil };
    }

    // El Set solo necesita los IDs para filtrar eficientemente
    const clientesIdSet = new Set(clientes.map(c => c.id));
    const appsDisponibles = new Set(
      customerAssignedData.slice(1).filter(row => clientesIdSet.has(String(row[2]))).map(row => String(row[1]))
    );

    const apps = appsData.slice(1).filter(row => appsDisponibles.has(String(row[1]))).map(row => ({
        Nombre: row[0], App: row[1], Imagen: row[2], Descripcion: row[3]
    }));

    const paneles = panelesData.slice(1).filter(row => row[4] !== "" && appsDisponibles.has(String(row[2]))).map(row => ({
        Nombre: row[0], Looker: row[1], Numero: row[2], Descripcion: row[3]
    }));
    
    const response = {
      userEmail: userEmail,
      apps: apps,
      paneles: paneles,
      clientes: clientes, // Ahora esto es una lista de objetos {id, name}
      urlDashboardApps: "https://lookerstudio.google.com/embed/reporting/affbb0f2-73e6-4642-aa1c-934ae295454f/page/puJRF"
    };

    return response;

  } catch (e) {
    Logger.log("Error en getInitialData: " + e.message + " Stack: " + e.stack);
    return { error: 'Ocurrió un error en el servidor al procesar los datos.' };
  }
}

/**
 * Obtiene apps y paneles para un cliente específico (o "Todos").
 * Este código no necesita cambios, ya que funciona con IDs.
 */
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
      clientsToFilter = allUserClients;
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
