/* Registro puro de capítulos, reutilizable por CLI y pruebas. */
export function insertChapterScript(html,id){
 if(typeof id!=='string'||!/^[a-z][a-z0-9-]{2,90}$/.test(id))throw Error('ID de capítulo inválido');
 const file='novel/chapters/'+id+'.js';
 if(html.includes('src="'+file+'"')||html.includes('src="'+file+'?'))
  throw Error('Capítulo ya registrado: '+id);
 const anchor=/(<script\s+src="novel\/relationships\.js(\?[^"]*)?"\s*><\/script>)/;
 const match=html.match(anchor);
 if(!match)throw Error('No se reconoce el punto de inserción de capítulos');
 const query=match[2]||'';
 return html.replace(anchor,'<script src="'+file+query+'"></script>\n$1');
}
