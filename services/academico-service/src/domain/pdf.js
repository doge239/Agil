// PDF de texto WinAnsi, sin dependencias externas. Generación en memoria y paginación.
function crearPdf(lineas) {
  const escapar = s => String(s).normalize('NFC').replace(/[^\x20-\xFF]/g, '?').replace(/[\\()]/g, '\\$&');
  const envueltas = lineas.flatMap(s => String(s).match(/.{1,88}(?:\s|$)|.{1,88}/g) || ['']);
  const paginas = [];
  for (let i=0; i<envueltas.length; i+=45) paginas.push(envueltas.slice(i,i+45));
  if (!paginas.length) paginas.push([]);
  const objetos = [null, '<< /Type /Catalog /Pages 2 0 R >>', '', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'];
  const hijos = [];
  for (const pagina of paginas) {
    const id = objetos.length; hijos.push(`${id} 0 R`);
    objetos.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${id+1} 0 R >>`);
    const contenido = `BT /F1 11 Tf 45 790 Td 16 TL ${pagina.map(s=>`(${escapar(s)}) Tj T*`).join('\n')} ET`;
    objetos.push(`<< /Length ${Buffer.byteLength(contenido,'latin1')} >>\nstream\n${contenido}\nendstream`);
  }
  objetos[2] = `<< /Type /Pages /Kids [${hijos.join(' ')}] /Count ${hijos.length} >>`;
  return empaquetar(objetos);
}
function empaquetar(objetos) {
  let pdf = '%PDF-1.4\n'; const offsets = [0];
  for(let i=1;i<objetos.length;i++) { offsets.push(Buffer.byteLength(pdf,'latin1')); pdf+=`${i} 0 obj\n${objetos[i]}\nendobj\n`; }
  const xref = Buffer.byteLength(pdf,'latin1');
  pdf+=`xref\n0 ${objetos.length}\n0000000000 65535 f \n${offsets.slice(1).map(n=>`${String(n).padStart(10,'0')} 00000 n \n`).join('')}trailer\n<< /Size ${objetos.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf,'latin1');
}
function paginaCertificado() {
  const escapar=s=>String(s).normalize('NFC').replace(/[^\x20-\xFF]/g,'?').replace(/[\\()]/g,'\\$&');
  const comandos=['q 0.99 0.97 0.94 rg 0 0 612 792 re f Q','q 0.70 0.36 0.15 RG 1.5 w 18 18 576 756 re S Q'];
  const escribir=(s,x,y,tamano=12,negrita=false)=>comandos.push(`BT /${negrita?'F2':'F1'} ${tamano} Tf 0.12 0.12 0.12 rg 1 0 0 1 ${x} ${y} Tm (${escapar(s)}) Tj ET`);
  const ancho=(s,t)=>s.length*t*0.53;
  const centrar=(s,y,t=12,n=false)=>escribir(s,Math.max(40,(612-ancho(s,t))/2),y,t,n);
  const parrafo=(s,y,n=false)=> {
    const palabras=s.split(/\s+/);let linea='';
    for(const palabra of palabras) {
      if(ancho(`${linea} ${palabra}`,12)>452&&linea){escribir(linea,80,y,12,n);y-=19;linea='';}
      linea+=(linea?' ':'')+palabra;
    }
    if(linea){escribir(linea,80,y,12,n);y-=19;}return y;
  };
  centrar('Universidad Católica del Norte',703,19,true);
  centrar('Departamento de Registro Curricular',679,14);
  centrar('Coquimbo',657,13);
  return {comandos,escribir,centrar,parrafo};
}
function cerrarCertificado(pagina,{referencia,fecha},numero,total) {
  const {escribir,centrar}=pagina;
  const fechaTexto=new Intl.DateTimeFormat('es-CL',{timeZone:'America/Santiago',day:'2-digit',month:'long',year:'numeric'}).format(fecha);
  escribir(`Coquimbo, ${fechaTexto}`,55,190);
  escribir('Emitido por el portal académico de demostración.',55,164,10);
  escribir('No contiene firma ni sello institucional. Sin validez oficial.',55,146,10);
  escribir(`Referencia de emisión: ${referencia}`,55,77,9);
  centrar(`Página ${numero} de ${total}`,52,9);
}
function empaquetarPaginas(paginas) {
  const objetos=[null,'<< /Type /Catalog /Pages 2 0 R >>','',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'];
  const hijos=[];
  for(const pagina of paginas) {
    const id=objetos.length;hijos.push(`${id} 0 R`);
    const contenido=pagina.comandos.join('\n');
    objetos.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${id+1} 0 R >>`);
    objetos.push(`<< /Length ${Buffer.byteLength(contenido,'latin1')} >>\nstream\n${contenido}\nendstream`);
  }
  objetos[2]=`<< /Type /Pages /Kids [${hijos.join(' ')}] /Count ${paginas.length} >>`;
  return empaquetar(objetos);
}
function crearCertificado({titulo,lineas,referencia,fecha=new Date()}) {
  // Reserva encabezado y pie en cada página. Divide también identificadores largos.
  const filas=lineas.flatMap(linea=> {
    const partes=String(linea).match(/.{1,65}(?:\s|$)|.{1,65}/g)||[''];
    return partes.map(s=>s.trim());
  });
  const paginas=[];
  for(let inicio=0;inicio<Math.max(filas.length,1);inicio+=15) {
    const pagina=paginaCertificado();
    pagina.centrar(titulo,592,17,true);
    pagina.centrar('DEMOSTRACIÓN - SIN VALIDEZ INSTITUCIONAL',545,10,true);
    filas.slice(inicio,inicio+15).forEach((linea,i)=>pagina.escribir(linea,80,501-i*19,12));
    paginas.push(pagina);
  }
  paginas.forEach((p,i)=>cerrarCertificado(p,{referencia,fecha},i+1,paginas.length));
  return empaquetarPaginas(paginas);
}
function crearAsignacionFamiliar({perfil,periodo,carrera,referencia,fecha=new Date()}) {
  const pagina=paginaCertificado();
  const {centrar,parrafo}=pagina;
  centrar('CERTIFICADO DE ALUMNO REGULAR',592,17,true);
  centrar('PARA ASIGNACIÓN FAMILIAR',568,14,true);
  centrar('DEMOSTRACIÓN - SIN VALIDEZ INSTITUCIONAL',545,10,true);
  let y=parrafo('La Universidad Católica del Norte certifica, para efectos de esta demostración, que:',501);
  const nombre=[perfil.apellido_paterno,perfil.apellido_materno,perfil.nombres].filter(Boolean).join(' ').toUpperCase();
  y=parrafo(nombre,y-12,true);
  y=parrafo(`R.U.T.: ${perfil.rut}`,y-8,true);
  y=parrafo(`Es alumno REGULAR para el ${periodo.semestre}° semestre del año ${periodo.anio} de la carrera ${carrera}.`,y-13);
  y=parrafo('Se otorga el presente certificado a pedido del interesado para:',y-15);
  parrafo('ACREDITAR DERECHO A PERCIBIR ASIGNACIÓN FAMILIAR',y-4,true);
  cerrarCertificado(pagina,{referencia,fecha},1,1);
  return empaquetarPaginas([pagina]);
}
module.exports = { crearPdf, crearCertificado, crearAsignacionFamiliar };
