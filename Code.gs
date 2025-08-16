const SPREADSHEET_ID_PRINCIPAL = '1PYUV-z5-FSJ19HgYH9BI5JO4wRHBQbnetxM9bswjJY8';
const SPREADSHEET_ID_PERMISOS = '16ZwoMXrNqYONetPME-2hb1dhhn826BDthO1AXUiFJUs';
const SPREADSHEET_ID_APPS_ASIGNADAS = '1-gyvb6fagOm9kA11ye1PKzPUG4nx3AQw4-pftTMsPD0';

function getSheetData(spreadsheetId, sheetName) {
  try {
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheet = ss.getSheetByName(sheetName);
    return sheet.getDataRange().getValues();
  } catch (e) {
    Logger.log(`Error al obtener los datos de la hoja ${sheetName}: ${e.message}`);
    return [];
  }
}

function getAppImage(fileId) {
  try {
    var file = DriveApp.getFileById(fileId);
    var blob = file.getBlob();
    var base64Data = Utilities.base64Encode(blob.getBytes());
    var mimeType = blob.getContentType();
    return 'data:' + mimeType + ';base64,' + base64Data;
  } catch(e) {
    // En caso de error, devuelve una cadena vacía para evitar fallos.
    return '';
  }
}

function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('Clientes 360 - G4S')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setFaviconUrl('https://asset.brandfetch.io/idvdGl5Oej/idY2feC_2F.png');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function obtenerUrlInicio() {
  return "https://script.google.com/a/macros/co.g4s.com/s/AKfycbxixUTNRrccx0DojWh375LxBL1VfuRlbG1qH-E4-OXcx5Ru-23Qtt--xZlZ5hzY3Fkf/exec";
}

function obtenerUrlDashboardAppsnicio() {
  return "https://lookerstudio.google.com/embed/reporting/affbb0f2-73e6-4642-aa1c-934ae295454f/page/puJRF";
}

function getUserEmail() {
  return Session.getEffectiveUser().getEmail();
}


function getAppsAndPanels() {
  const userEmail = getUserEmail();
  const perfil = obtenerPerfil(userEmail);
  
  if (!perfil) {
    return { error: 'Perfil no encontrado' };
  }
  
  const clientes = obtenerClientes(perfil);
  if (clientes.length === 0) {
    return { error: 'No se encontraron clientes asignados' };
  }
  
  const appsDisponibles = appsAsignadas(clientes);

  const appsData = getSheetData(SPREADSHEET_ID_PRINCIPAL, 'Apps');
  const panelesData = getSheetData(SPREADSHEET_ID_PRINCIPAL, 'Paneles');

  const apps = appsData
    .slice(1)
    .filter(row => appsDisponibles.includes(row[1]))
    .map(row => ({
      Nombre: row[0],
      App: row[1],
      Imagen: row[2],
      Descripcion: row[3]
    }));

  const paneles = panelesData
    .slice(1)
    .filter(row => row[4] !== "" && appsDisponibles.includes(row[2]))
    .map(row => ({
      Nombre: row[0],
      Looker: row[1],
      Numero: row[2],
      Descripcion: row[3]
    }));

  return { apps, paneles };
}

function obtenerPerfil(userEmail) { 
  const data = getSheetData(SPREADSHEET_ID_PERMISOS, 'PermisosPerfil');
  const perfilEncontrado = data.find(row => row[3] === userEmail);
  return perfilEncontrado ? perfilEncontrado[1] : '';
}

function obtenerClientes(perfil) { 
  const data = getSheetData(SPREADSHEET_ID_PERMISOS, 'PermisosCliente');
  return data
    .slice(1)
    .filter(row => row[2] === perfil)
    .map(row => row[1]);
}

function appsAsignadas(clientes) { 
  const data = getSheetData(SPREADSHEET_ID_APPS_ASIGNADAS, 'customerAssigned');
  return data
    .slice(1)
    .filter(row => clientes.includes(row[2]))
    .map(row => row[1]);
} 
