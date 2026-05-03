"""
Generates CSVs for Neo4j Aura import — LinkedIn-style social network.

Nodes (6500 distinct):
  Usuario             : 2000  (200 also carry :Admin dual-label)
  Empresa             :  500
  Publicacion         : 1500
  Empleo              :  600
  Educacion           :  400
  ExperienciaLaboral  : 1500  (intermediate node between Usuario and Empresa)

Relationships (12 types, all guaranteed connected):
  CONECTADO_CON   Usuario            → Usuario
  PUBLICO         Usuario            → Publicacion
  DIO_LIKE        Usuario            → Publicacion
  COMENTO         Usuario            → Publicacion
  COMPARTIO       Usuario            → Publicacion
  ESTUDIO_EN      Usuario            → Educacion
  POSTULO_A       Usuario            → Empleo
  OFERTA          Empresa            → Empleo
  SIGUE_A         Usuario            → Empresa
  TRABAJO_EN      Usuario            → ExperienciaLaboral
  EXPERIENCIA_EN  ExperienciaLaboral → Empresa
  MENCIONA        Publicacion        → Usuario

List properties (habilidades, tags) use ';' as separator.
In Cypher: split(row.field, ';')

Run:  python3 generate_neo4j_csv.py
Out:  neo4j_csv/
"""

import csv
import os
import random
from datetime import date, timedelta

random.seed(42)

# ── counts ────────────────────────────────────────────────────────────────────
N_USUARIOS      = 2000
N_ADMINS        = 200
N_EMPRESAS      =  500
N_PUBLICACIONES = 1500
N_EMPLEOS       =  600
N_EDUCACIONES   =  400
N_EXPERIENCIAS  = 1500

OUT = "neo4j_csv"
os.makedirs(OUT, exist_ok=True)

# ── helpers ───────────────────────────────────────────────────────────────────

def rand_date(y0=2015, y1=2025):
    s = date(y0, 1, 1)
    e = date(y1, 12, 31)
    return (s + timedelta(days=random.randint(0, (e - s).days))).isoformat()

def rand_bool():
    return random.choice(["true", "false"])

def rand_list(pool, lo=2, hi=5):
    return ";".join(random.sample(pool, random.randint(lo, hi)))

def write_csv(name, header, rows):
    path = f"{OUT}/{name}"
    with open(path, "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(header)
        w.writerows(rows)
    print(f"  {name:<38} {len(rows):>6} rows")
    return path

# ── data pools ────────────────────────────────────────────────────────────────

FIRST = [
    "Ana","Carlos","María","José","Lucía","Pedro","Sofía","Diego","Isabella","Miguel",
    "Valentina","Andrés","Camila","Luis","Paula","Jorge","Daniela","Roberto","Fernanda",
    "Alejandro","Gabriela","Francisco","Natalia","Sebastián","Laura","Mateo","Elena",
    "David","Renata","Hugo","Valeria","Emilio","Marcela","Rafael","Paola","Cristian",
    "Adriana","Felipe","Mónica","Javier","Beatriz","Ignacio","Claudia","Tomás","Sara",
]
LAST = [
    "García","Martínez","López","González","Rodríguez","Pérez","Sánchez","Ramírez",
    "Torres","Flores","Rivera","Herrera","Morales","Jiménez","Ruiz","Vargas","Castillo",
    "Ortiz","Mendoza","Ramos","Cruz","Reyes","Gómez","Díaz","Chávez","Vásquez",
    "Acosta","Muñoz","Alvarado","Paredes","Fuentes","Guerrero","León","Medina",
]
TITULOS_PRO = [
    "Software Engineer","Backend Developer","Full Stack Developer","Data Scientist",
    "DevOps Engineer","Product Manager","UX Designer","Frontend Developer",
    "Machine Learning Engineer","Cloud Architect","QA Engineer","Mobile Developer",
    "Tech Lead","CTO","Solutions Architect","Database Administrator",
    "Cybersecurity Analyst","AI Engineer","Business Analyst","Scrum Master",
    "Platform Engineer","Site Reliability Engineer","Engineering Manager",
]
ADJ_EMP = ["Tech","Digital","Smart","Global","Nexus","Core","Peak","Edge","Prime","Alpha",
           "Blue","Open","Rapid","Clear","Bright","Flex","Swift","Bold","Deep","Future"]
NOM_EMP = ["Solutions","Systems","Labs","Works","Group","Corp","Hub","Forge","Base","Soft",
           "Dynamics","Logic","Net","Bridge","Ops","Mind","Data","Cloud","Byte","Stream"]
EMP_SUF = ["S.A.","LLC","Corp","Inc","Ltda","S.R.L."]
HABILIDADES = [
    "Python","Java","JavaScript","TypeScript","Go","Rust","C++","C#","Kotlin","Swift",
    "React","Vue.js","Angular","Node.js","Django","FastAPI","Spring Boot","Laravel",
    "Docker","Kubernetes","AWS","GCP","Azure","Terraform","CI/CD","Linux",
    "PostgreSQL","MongoDB","Neo4j","Redis","Elasticsearch","Cassandra",
    "Machine Learning","Deep Learning","NLP","Computer Vision","SQL","Git",
    "Agile","Scrum","REST APIs","GraphQL","Microservices","Kafka","RabbitMQ",
]
INDUSTRIAS = [
    "Tecnología","Finanzas","Salud","Educación","Retail","Manufactura",
    "Telecomunicaciones","Energía","Transporte","Consultoría",
    "Medios","Gobierno","ONG","Agroindustria","Turismo","Logística","Seguros",
]
PAISES = [
    "Guatemala","México","Colombia","Argentina","España","Chile","Perú","Ecuador",
    "Venezuela","Bolivia","Costa Rica","Panamá","Uruguay","Paraguay","Honduras",
    "El Salvador","Nicaragua","República Dominicana","Brasil","Cuba",
]
TITULOS_EMPLEO = [
    "Desarrollador Backend","Desarrollador Frontend","Full Stack Developer",
    "Data Scientist","DevOps Engineer","Product Manager","UX/UI Designer",
    "Analista de Datos","Ingeniero de Software","Arquitecto de Soluciones",
    "Desarrollador Mobile","QA Engineer","Machine Learning Engineer",
    "Administrador de Base de Datos","Analista de Ciberseguridad",
    "Scrum Master","Tech Lead","Cloud Engineer","Business Analyst",
    "Desarrollador Python","Desarrollador Java","Desarrollador JavaScript",
    "Especialista en IA","Desarrollador Blockchain","Pentester",
]
MODALIDADES   = ["remoto","presencial","híbrido"]
INSTITUCIONES = [
    "Universidad del Valle de Guatemala","Universidad de San Carlos de Guatemala",
    "Universidad Francisco Marroquín","Universidad Galileo","Universidad Rafael Landívar",
    "ITESM","UNAM","Universidad de los Andes","Pontificia Universidad Católica de Chile",
    "Universidad Nacional de Colombia","Universidad de Chile","PUCP",
    "Instituto Tecnológico de Costa Rica","Universidad de Buenos Aires",
    "Universitat Politècnica de Catalunya","Stanford University","MIT",
    "Universidad Autónoma de Madrid","Universidad Nacional Autónoma de México",
    "Universidad Simon Bolivar",
]
CARRERAS = [
    "Ingeniería en Sistemas","Ciencias de la Computación","Ingeniería en Informática",
    "Ciencias de Datos","Ingeniería de Software","Redes y Telecomunicaciones",
    "Inteligencia Artificial","Ciberseguridad","Administración de Empresas",
    "Ingeniería Industrial","Matemáticas Aplicadas","Estadística","Física",
    "Ingeniería Electrónica","Diseño de Interacción",
]
GRADOS        = ["Licenciatura","Maestría","Doctorado","Técnico","Ingeniería","Especialización"]
TAGS          = [
    "tech","python","ia","trabajo","networking","empleo","data","cloud","devops",
    "startups","Guatemala","latam","carrera","aprendizaje","innovacion","noticias",
    "desarrollo","ciberseguridad","liderazgo","producto","diseño","fintech","edtech",
]
CONTENIDOS = [
    "Emocionado de compartir que acabo de completar mi certificación en {tema}.",
    "¿Alguien más está trabajando con {tema}? Me encantaría conectar.",
    "Reflexión del día: la clave del éxito en {tema} es la constancia.",
    "Buscando profesionales en {tema} para un proyecto increíble.",
    "Acabo de publicar un artículo sobre las tendencias en {tema}. ¿Qué opinan?",
    "Nuevo reto personal: aprender {tema} en 30 días. ¿Quién se une?",
    "Gran evento de networking hoy. Aprendí mucho sobre {tema}.",
    "Pro tip sobre {tema}: siempre documenta tu proceso.",
    "El mercado laboral en {tema} está creciendo increíblemente.",
    "Muy agradecido con mi equipo por el lanzamiento de nuestro proyecto de {tema}.",
    "Compartiendo recursos gratuitos para aprender {tema}.",
    "Debate: ¿cuál es el mayor reto de {tema} en Latinoamérica?",
]
NIVEL_ACCESO  = ["moderador","superadmin","admin","editor"]
CARGOS        = [
    "Software Engineer","Senior Developer","Junior Developer","Tech Lead","CTO",
    "Engineering Manager","Product Owner","Data Analyst","DevOps Engineer","QA Engineer",
    "UX Designer","Business Analyst","Intern","Consultant","Director of Engineering",
]
COMENTARIOS   = [
    "Totalmente de acuerdo con este punto de vista.",
    "Gracias por compartir, muy útil para mi carrera.",
    "Interesante perspectiva, ¿tienes algún recurso extra?",
    "Excelente publicación, muy relevante hoy en día.",
    "Comparto tu opinión, lo he vivido también.",
    "¿Podrías ampliar un poco más sobre este tema?",
    "Muy inspirador, justo lo que necesitaba leer hoy.",
    "Gran reflexión, hay mucho por mejorar en la industria.",
]
TIPOS_REACCION  = ["me_gusta","celebro","apoyo","me_interesa","me_divierte"]
NIVELES_CONEXION= ["1er nivel","2do nivel","3er nivel"]
ESTADOS_POSTULO = ["pendiente","revisado","rechazado","contratado"]
MOTIVOS_SIGUE   = ["posible empleador","interés en la industria","networking",
                   "seguimiento de ofertas","cliente potencial","ex empleador",
                   "trabajo actual","interés general"]
TIPOS_MENCION   = ["autor","colaborador","etiqueta"]
VISIBILIDADES   = ["pública","conexiones","privada"]
DEPARTAMENTOS   = [
    "Backend","Frontend","Data Engineering","DevOps","Infraestructura","QA",
    "Producto","Diseño UX","Ciberseguridad","BI y Analytics","Mobile","Cloud",
    "Plataforma","Machine Learning","Operaciones","Finanzas","Legal","Marketing",
]
TIPOS_CONTRATO  = ["tiempo_completo","medio_tiempo","freelance","contrato","pasantía"]
DESCRIPCIONES   = [
    "Desarrollo y mantenimiento de {area} en un entorno ágil.",
    "Liderazgo técnico del equipo de {area} con enfoque en calidad.",
    "Implementación de soluciones escalables para {area}.",
    "Colaboración con equipos multidisciplinarios en proyectos de {area}.",
    "Investigación y aplicación de nuevas tecnologías en {area}.",
    "Optimización de procesos y rendimiento en {area}.",
    "Consultoría interna y externa para proyectos de {area}.",
]

# ─────────────────────────────────────────────────────────────────────────────
# NODES
# ─────────────────────────────────────────────────────────────────────────────
print("\n── Nodes ────────────────────────────────────────────────────────────────")

# ── Usuarios ─────────────────────────────────────────────────────────────────
admin_ids   = set(random.sample(range(N_USUARIOS), N_ADMINS))
used_emails = set()
u_rows = []
for i in range(N_USUARIOS):
    fn   = random.choice(FIRST)
    ln   = random.choice(LAST)
    dom  = random.choice(["gmail.com","outlook.com","yahoo.com","proton.me","empresa.gt"])
    mail = f"{fn.lower()}.{ln.lower()}_{i}@{dom}"
    while mail in used_emails:
        mail = f"{fn.lower()}{i}_{random.randint(0,9999)}@{dom}"
    used_emails.add(mail)

    is_adm = i in admin_ids
    u_rows.append([
        f"u{i}", f"{fn} {ln}", mail,
        random.choice(TITULOS_PRO),
        rand_list(HABILIDADES, 3, 7),
        rand_bool(), rand_date(2018, 2025), random.randint(0, 3000),
        str(is_adm).lower(),
        random.choice(NIVEL_ACCESO) if is_adm else "",
        rand_bool()                  if is_adm else "",
        rand_date(2020, 2025)        if is_adm else "",
        f"{random.choice(FIRST)} {random.choice(LAST)}" if is_adm else "",
        rand_bool()                  if is_adm else "",
    ])
write_csv("usuarios.csv", [
    "usuario_id","nombre","email","titular","habilidades",
    "abierto_a_trabajo","fecha_registro","conexiones_count",
    "is_admin","nivel_acceso","puede_moderar",
    "fecha_asignacion","asignado_por","admin_activo",
], u_rows)

# ── Empresas ──────────────────────────────────────────────────────────────────
used_nombres = set()
e_rows = []
for i in range(N_EMPRESAS):
    base   = f"{random.choice(ADJ_EMP)}{random.choice(NOM_EMP)}"
    nombre = f"{base} {random.choice(EMP_SUF)}"
    while nombre in used_nombres:
        nombre = f"{base}{random.randint(2,99)} {random.choice(EMP_SUF)}"
    used_nombres.add(nombre)
    e_rows.append([
        f"e{i}", nombre,
        random.choice(INDUSTRIAS), random.choice(PAISES),
        rand_bool(), random.randint(10, 80000), rand_date(1985, 2022),
    ])
write_csv("empresas.csv", [
    "empresa_id","nombre","industria","pais","verificada","empleados_count","fecha_fundacion",
], e_rows)

# ── Publicaciones ─────────────────────────────────────────────────────────────
temas  = HABILIDADES + INDUSTRIAS
p_rows = []
for i in range(N_PUBLICACIONES):
    p_rows.append([
        f"p{i}",
        random.choice(CONTENIDOS).format(tema=random.choice(temas)),
        rand_date(2020, 2026), random.randint(0, 8000),
        rand_list(TAGS, 1, 4), rand_bool(),
    ])
write_csv("publicaciones.csv", [
    "publicacion_id","contenido","fecha_publicacion","likes_count","tags","es_oferta",
], p_rows)

# ── Empleos ───────────────────────────────────────────────────────────────────
j_rows = []
for i in range(N_EMPLEOS):
    smin = round(random.uniform(600, 6000), 2)
    j_rows.append([
        f"j{i}", random.choice(TITULOS_EMPLEO),
        smin, round(smin + random.uniform(400, 5000), 2),
        random.choice(MODALIDADES), rand_bool(), rand_date(2022, 2026),
    ])
write_csv("empleos.csv", [
    "empleo_id","titulo","salario_min","salario_max","modalidad","activo","fecha_publicacion",
], j_rows)

# ── Educacion ─────────────────────────────────────────────────────────────────
ed_rows = []
for i in range(N_EDUCACIONES):
    ed_rows.append([
        f"ed{i}",
        random.choice(INSTITUCIONES), random.choice(CARRERAS),
        random.choice(GRADOS), random.choice(PAISES), rand_bool(),
    ])
write_csv("educaciones.csv", [
    "educacion_id","institucion","carrera","grado","pais","acreditada",
], ed_rows)

# ── ExperienciaLaboral ────────────────────────────────────────────────────────
exp_rows = []
for i in range(N_EXPERIENCIAS):
    dept = random.choice(DEPARTAMENTOS)
    desc = random.choice(DESCRIPCIONES).format(area=dept.lower())
    smin = round(random.uniform(800, 8000), 2)
    exp_rows.append([
        f"exp{i}", random.choice(CARGOS),
        smin, desc, rand_bool(),
    ])
write_csv("experiencias.csv", [
    "exp_id","cargo","salario","descripcion","activo",
], exp_rows)

# ─────────────────────────────────────────────────────────────────────────────
# RELATIONSHIPS
# All 11 types. Connectivity guarantees:
#   • Every Publicacion  ← exactly 1 PUBLICO           (from a Usuario)
#   • Every Empleo       ← exactly 1 OFERTA            (from an Empresa)
#   • Every Educacion    ← at least 1 ESTUDIO_EN       (from a Usuario)
#   • Every Empresa      ← at least 1 EXPERIENCIA_EN   (from an ExperienciaLaboral)
#   • Every ExperienciaLaboral ← at least 1 TRABAJO_EN (from a Usuario)
#   • Every Usuario      → at least 1 CONECTADO_CON    (to another Usuario)
# ─────────────────────────────────────────────────────────────────────────────
print("\n── Relationships ────────────────────────────────────────────────────────")

U   = [f"u{i}"   for i in range(N_USUARIOS)]
E   = [f"e{i}"   for i in range(N_EMPRESAS)]
P   = [f"p{i}"   for i in range(N_PUBLICACIONES)]
J   = [f"j{i}"   for i in range(N_EMPLEOS)]
ED  = [f"ed{i}"  for i in range(N_EDUCACIONES)]
EXP = [f"exp{i}" for i in range(N_EXPERIENCIAS)]

# ── 1. CONECTADO_CON  Usuario → Usuario ───────────────────────────────────────
# Spanning chain guarantees every user has ≥1 connection, then add extras.
cc_seen = set()
cc_rows = []

# base chain: u0-u1, u1-u2, ..., uN-1-u0  (ring → fully connected)
shuffled_u = U[:]
random.shuffle(shuffled_u)
for i in range(len(shuffled_u)):
    a, b = shuffled_u[i], shuffled_u[(i + 1) % len(shuffled_u)]
    cc_seen.add((a, b))
    cc_rows.append([
        a, b, rand_date(2019, 2025),
        random.choice(NIVELES_CONEXION), rand_bool(),
    ])

# extra random connections up to ~5000
attempts = 0
while len(cc_rows) < 5000 and attempts < 200_000:
    a, b = random.sample(U, 2)
    if (a, b) not in cc_seen:
        cc_seen.add((a, b))
        cc_rows.append([a, b, rand_date(2019, 2025),
                        random.choice(NIVELES_CONEXION), rand_bool()])
    attempts += 1

write_csv("rel_conectado_con.csv",
    ["from_usuario_id","to_usuario_id","fecha_conexion","nivel","aceptada"],
    cc_rows)

# ── 2. PUBLICO  Usuario → Publicacion ─────────────────────────────────────────
# Each publication has exactly one author.
pub_rows = []
for pid in P:
    pub_rows.append([
        random.choice(U), pid,
        rand_date(2020, 2026), rand_bool(), rand_bool(),
    ])
write_csv("rel_publico.csv",
    ["usuario_id","publicacion_id","fecha","anonimo","desde_empresa"],
    pub_rows)

# ── 3. DIO_LIKE  Usuario → Publicacion ────────────────────────────────────────
like_seen = set()
like_rows = []
attempts = 0
while len(like_rows) < 6000 and attempts < 300_000:
    u, p = random.choice(U), random.choice(P)
    if (u, p) not in like_seen:
        like_seen.add((u, p))
        like_rows.append([u, p, rand_date(2020, 2026),
                          random.choice(TIPOS_REACCION), rand_bool()])
    attempts += 1
write_csv("rel_dio_like.csv",
    ["usuario_id","publicacion_id","fecha","tipo_reaccion","notificado"],
    like_rows)

# ── 4. COMENTO  Usuario → Publicacion ─────────────────────────────────────────
com_seen = set()
com_rows = []
attempts = 0
while len(com_rows) < 3000 and attempts < 200_000:
    u, p = random.choice(U), random.choice(P)
    if (u, p) not in com_seen:
        com_seen.add((u, p))
        com_rows.append([u, p, random.choice(COMENTARIOS),
                         rand_date(2020, 2026), rand_bool()])
    attempts += 1
write_csv("rel_comento.csv",
    ["usuario_id","publicacion_id","contenido","fecha","editado"],
    com_rows)

# ── 5. COMPARTIO  Usuario → Publicacion ───────────────────────────────────────
shr_seen = set()
shr_rows = []
attempts = 0
while len(shr_rows) < 2500 and attempts < 200_000:
    u, p = random.choice(U), random.choice(P)
    if (u, p) not in shr_seen:
        shr_seen.add((u, p))
        shr_rows.append([u, p, rand_date(2020, 2026),
                         rand_bool(), random.choice(VISIBILIDADES)])
    attempts += 1
write_csv("rel_compartio.csv",
    ["usuario_id","publicacion_id","fecha","con_comentario","visibilidad"],
    shr_rows)

# ── 6. ESTUDIO_EN  Usuario → Educacion ────────────────────────────────────────
# Every educacion covered first, then extras.
est_seen = set()
est_rows = []

# guarantee: each educacion touched at least once
shuffled_ed = ED[:]
random.shuffle(shuffled_ed)
for ed in shuffled_ed:
    u = random.choice(U)
    while (u, ed) in est_seen:
        u = random.choice(U)
    est_seen.add((u, ed))
    yi = random.randint(2005, 2020)
    yg = yi + random.randint(3, 6)
    grad = rand_bool()
    est_rows.append([u, ed,
                     date(yi, 1, 1).isoformat(),
                     date(yg, 6, 15).isoformat() if grad == "true" else "",
                     grad])

# add more so each user gets ~1-2 educations
attempts = 0
while len(est_rows) < 3000 and attempts < 200_000:
    u, ed = random.choice(U), random.choice(ED)
    if (u, ed) not in est_seen:
        est_seen.add((u, ed))
        yi   = random.randint(2005, 2020)
        yg   = yi + random.randint(3, 6)
        grad = rand_bool()
        est_rows.append([u, ed,
                         date(yi, 1, 1).isoformat(),
                         date(yg, 6, 15).isoformat() if grad == "true" else "",
                         grad])
    attempts += 1
write_csv("rel_estudio_en.csv",
    ["usuario_id","educacion_id","fecha_inicio","fecha_graduacion","graduado"],
    est_rows)

# ── 7. POSTULO_A  Usuario → Empleo ────────────────────────────────────────────
# Each empleo gets at least 1 applicant first, then extras.
post_seen = set()
post_rows = []

for jid in J:
    u = random.choice(U)
    while (u, jid) in post_seen:
        u = random.choice(U)
    post_seen.add((u, jid))
    post_rows.append([u, jid, rand_date(2022, 2026),
                      random.choice(ESTADOS_POSTULO), rand_bool()])

attempts = 0
while len(post_rows) < 3000 and attempts < 200_000:
    u, jid = random.choice(U), random.choice(J)
    if (u, jid) not in post_seen:
        post_seen.add((u, jid))
        post_rows.append([u, jid, rand_date(2022, 2026),
                          random.choice(ESTADOS_POSTULO), rand_bool()])
    attempts += 1
write_csv("rel_postulo_a.csv",
    ["usuario_id","empleo_id","fecha_postulacion","estado","carta_presentacion"],
    post_rows)

# ── 8. OFERTA  Empresa → Empleo ───────────────────────────────────────────────
# Each empleo belongs to exactly one empresa.
off_rows = []
for jid in J:
    off_rows.append([
        random.choice(E), jid,
        rand_date(2022, 2026), rand_bool(), rand_bool(),
    ])
write_csv("rel_oferta.csv",
    ["empresa_id","empleo_id","fecha_publicacion","urgente","remunerado"],
    off_rows)

# ── 9. SIGUE_A  Usuario → Empresa ─────────────────────────────────────────────
sig_seen = set()
sig_rows = []
attempts = 0
while len(sig_rows) < 4000 and attempts < 300_000:
    u, e = random.choice(U), random.choice(E)
    if (u, e) not in sig_seen:
        sig_seen.add((u, e))
        sig_rows.append([u, e, rand_date(2019, 2026),
                         rand_bool(), random.choice(MOTIVOS_SIGUE)])
    attempts += 1
write_csv("rel_sigue_a.csv",
    ["usuario_id","empresa_id","fecha_seguimiento","notificaciones","motivo"],
    sig_rows)

# ── 10. EXPERIENCIA_EN  ExperienciaLaboral → Empresa ──────────────────────────
# Every empresa gets at least 1 ExperienciaLaboral first, then extras.
xen_seen = set()
xen_rows = []

shuffled_e = E[:]
random.shuffle(shuffled_e)
exp_pool = EXP[:]
random.shuffle(exp_pool)

# guarantee: each empresa has at least 1 experiencia
for idx, eid in enumerate(shuffled_e):
    xid = exp_pool[idx % len(exp_pool)]
    while (xid, eid) in xen_seen:
        xid = random.choice(EXP)
    xen_seen.add((xid, eid))
    xen_rows.append([xid, eid,
                     random.choice(DEPARTAMENTOS),
                     random.choice(TIPOS_CONTRATO),
                     random.choice(MODALIDADES)])

attempts = 0
while len(xen_rows) < 2500 and attempts < 200_000:
    xid, eid = random.choice(EXP), random.choice(E)
    if (xid, eid) not in xen_seen:
        xen_seen.add((xid, eid))
        xen_rows.append([xid, eid,
                         random.choice(DEPARTAMENTOS),
                         random.choice(TIPOS_CONTRATO),
                         random.choice(MODALIDADES)])
    attempts += 1
write_csv("rel_experiencia_en.csv",
    ["exp_id","empresa_id","departamento","tipo_contrato","modalidad"],
    xen_rows)

# ── 11. TRABAJO_EN  Usuario → ExperienciaLaboral ──────────────────────────────
# Every ExperienciaLaboral gets at least 1 usuario first, then extras.
te_seen = set()
te_rows = []

shuffled_exp = EXP[:]
random.shuffle(shuffled_exp)

for xid in shuffled_exp:
    u = random.choice(U)
    while (u, xid) in te_seen:
        u = random.choice(U)
    te_seen.add((u, xid))
    yi = random.randint(2015, 2024)
    activo = rand_bool()
    te_rows.append([u, xid,
                    date(yi, 1, 1).isoformat(),
                    date(yi + random.randint(1, 4), 6, 30).isoformat() if activo == "false" else "",
                    rand_bool()])

attempts = 0
while len(te_rows) < 3000 and attempts < 200_000:
    u, xid = random.choice(U), random.choice(EXP)
    if (u, xid) not in te_seen:
        te_seen.add((u, xid))
        yi = random.randint(2015, 2024)
        activo = rand_bool()
        te_rows.append([u, xid,
                        date(yi, 1, 1).isoformat(),
                        date(yi + random.randint(1, 4), 6, 30).isoformat() if activo == "false" else "",
                        rand_bool()])
    attempts += 1
write_csv("rel_trabajo_en.csv",
    ["usuario_id","exp_id","fecha_inicio","fecha_fin","verificado"],
    te_rows)

# ── 11. MENCIONA  Publicacion → Usuario ───────────────────────────────────────
men_seen = set()
men_rows = []
attempts = 0
while len(men_rows) < 1500 and attempts < 200_000:
    p, u = random.choice(P), random.choice(U)
    if (p, u) not in men_seen:
        men_seen.add((p, u))
        men_rows.append([p, u, rand_date(2020, 2026),
                         random.choice(TIPOS_MENCION), rand_bool()])
    attempts += 1
write_csv("rel_menciona.csv",
    ["publicacion_id","usuario_id","fecha","tipo","confirmada"],
    men_rows)

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
total_nodes = N_USUARIOS + N_EMPRESAS + N_PUBLICACIONES + N_EMPLEOS + N_EDUCACIONES + N_EXPERIENCIAS
print(f"""
── Summary ──────────────────────────────────────────────────────────────────
  Nodes  : {total_nodes} distinct  ({N_ADMINS} usuarios also carry :Admin)
           includes {N_EXPERIENCIAS} ExperienciaLaboral (intermediate nodes)
  Output : {OUT}/
─────────────────────────────────────────────────────────────────────────────
""")

# ─────────────────────────────────────────────────────────────────────────────
# Neo4j Aura — LOAD CSV Cypher
# Run each block in order (nodes first, then relationships).
# Upload all CSVs to your Aura instance import bucket beforehand.
# ─────────────────────────────────────────────────────────────────────────────
CYPHER = """
════════════════════════════════════════════════════════════════════════════════
 NEO4J AURA — LOAD CSV CYPHER  (paste each block in the Neo4j Browser / Cypher)
════════════════════════════════════════════════════════════════════════════════

── Step 0: Constraints (run once before loading) ────────────────────────────

CREATE CONSTRAINT usuario_id    IF NOT EXISTS FOR (n:Usuario)            REQUIRE n.usuario_id    IS UNIQUE;
CREATE CONSTRAINT empresa_id    IF NOT EXISTS FOR (n:Empresa)            REQUIRE n.empresa_id    IS UNIQUE;
CREATE CONSTRAINT pub_id        IF NOT EXISTS FOR (n:Publicacion)        REQUIRE n.publicacion_id IS UNIQUE;
CREATE CONSTRAINT empleo_id     IF NOT EXISTS FOR (n:Empleo)             REQUIRE n.empleo_id     IS UNIQUE;
CREATE CONSTRAINT educacion_id  IF NOT EXISTS FOR (n:Educacion)          REQUIRE n.educacion_id  IS UNIQUE;
CREATE CONSTRAINT exp_id        IF NOT EXISTS FOR (n:ExperienciaLaboral) REQUIRE n.exp_id        IS UNIQUE;

── Step 1: Nodes ─────────────────────────────────────────────────────────────

// Usuarios  (includes dual-label :Admin when is_admin = 'true')
LOAD CSV WITH HEADERS FROM 'file:///usuarios.csv' AS row
CALL {
  WITH row
  CREATE (u:Usuario {
    usuario_id:        row.usuario_id,
    nombre:            row.nombre,
    email:             row.email,
    titular:           row.titular,
    habilidades:       split(row.habilidades, ';'),
    abierto_a_trabajo: row.abierto_a_trabajo = 'true',
    fecha_registro:    date(row.fecha_registro),
    conexiones_count:  toInteger(row.conexiones_count)
  })
  WITH u, row WHERE row.is_admin = 'true'
  SET u:Admin,
      u.nivel_acceso     = row.nivel_acceso,
      u.puede_moderar    = row.puede_moderar = 'true',
      u.fecha_asignacion = date(row.fecha_asignacion),
      u.asignado_por     = row.asignado_por,
      u.activo           = row.admin_activo = 'true'
} IN TRANSACTIONS OF 500 ROWS;

// Empresas
LOAD CSV WITH HEADERS FROM 'file:///empresas.csv' AS row
CALL {
  WITH row
  CREATE (:Empresa {
    empresa_id:      row.empresa_id,
    nombre:          row.nombre,
    industria:       row.industria,
    pais:            row.pais,
    verificada:      row.verificada = 'true',
    empleados_count: toInteger(row.empleados_count),
    fecha_fundacion: date(row.fecha_fundacion)
  })
} IN TRANSACTIONS OF 500 ROWS;

// Publicaciones
LOAD CSV WITH HEADERS FROM 'file:///publicaciones.csv' AS row
CALL {
  WITH row
  CREATE (:Publicacion {
    publicacion_id:    row.publicacion_id,
    contenido:         row.contenido,
    fecha_publicacion: date(row.fecha_publicacion),
    likes_count:       toInteger(row.likes_count),
    tags:              split(row.tags, ';'),
    es_oferta:         row.es_oferta = 'true'
  })
} IN TRANSACTIONS OF 500 ROWS;

// Empleos
LOAD CSV WITH HEADERS FROM 'file:///empleos.csv' AS row
CALL {
  WITH row
  CREATE (:Empleo {
    empleo_id:         row.empleo_id,
    titulo:            row.titulo,
    salario_min:       toFloat(row.salario_min),
    salario_max:       toFloat(row.salario_max),
    modalidad:         row.modalidad,
    activo:            row.activo = 'true',
    fecha_publicacion: date(row.fecha_publicacion)
  })
} IN TRANSACTIONS OF 500 ROWS;

// Educacion
LOAD CSV WITH HEADERS FROM 'file:///educaciones.csv' AS row
CALL {
  WITH row
  CREATE (:Educacion {
    educacion_id: row.educacion_id,
    institucion:  row.institucion,
    carrera:      row.carrera,
    grado:        row.grado,
    pais:         row.pais,
    acreditada:   row.acreditada = 'true'
  })
} IN TRANSACTIONS OF 500 ROWS;

// ExperienciaLaboral
LOAD CSV WITH HEADERS FROM 'file:///experiencias.csv' AS row
CALL {
  WITH row
  CREATE (:ExperienciaLaboral {
    exp_id:      row.exp_id,
    cargo:       row.cargo,
    salario:     toFloat(row.salario),
    descripcion: row.descripcion,
    activo:      row.activo = 'true'
  })
} IN TRANSACTIONS OF 500 ROWS;

── Step 2: Relationships ─────────────────────────────────────────────────────

// CONECTADO_CON
LOAD CSV WITH HEADERS FROM 'file:///rel_conectado_con.csv' AS row
CALL {
  WITH row
  MATCH (a:Usuario {usuario_id: row.from_usuario_id})
  MATCH (b:Usuario {usuario_id: row.to_usuario_id})
  MERGE (a)-[r:CONECTADO_CON]->(b)
  SET r.fecha_conexion = date(row.fecha_conexion),
      r.nivel          = row.nivel,
      r.aceptada       = row.aceptada = 'true'
} IN TRANSACTIONS OF 500 ROWS;

// PUBLICO
LOAD CSV WITH HEADERS FROM 'file:///rel_publico.csv' AS row
CALL {
  WITH row
  MATCH (u:Usuario     {usuario_id:     row.usuario_id})
  MATCH (p:Publicacion {publicacion_id: row.publicacion_id})
  MERGE (u)-[r:PUBLICO]->(p)
  SET r.fecha         = date(row.fecha),
      r.anonimo       = row.anonimo       = 'true',
      r.desde_empresa = row.desde_empresa = 'true'
} IN TRANSACTIONS OF 500 ROWS;

// DIO_LIKE
LOAD CSV WITH HEADERS FROM 'file:///rel_dio_like.csv' AS row
CALL {
  WITH row
  MATCH (u:Usuario     {usuario_id:     row.usuario_id})
  MATCH (p:Publicacion {publicacion_id: row.publicacion_id})
  MERGE (u)-[r:DIO_LIKE]->(p)
  SET r.fecha         = date(row.fecha),
      r.tipo_reaccion = row.tipo_reaccion,
      r.notificado    = row.notificado = 'true'
} IN TRANSACTIONS OF 500 ROWS;

// COMENTO
LOAD CSV WITH HEADERS FROM 'file:///rel_comento.csv' AS row
CALL {
  WITH row
  MATCH (u:Usuario     {usuario_id:     row.usuario_id})
  MATCH (p:Publicacion {publicacion_id: row.publicacion_id})
  MERGE (u)-[r:COMENTO]->(p)
  SET r.contenido = row.contenido,
      r.fecha     = date(row.fecha),
      r.editado   = row.editado = 'true'
} IN TRANSACTIONS OF 500 ROWS;

// COMPARTIO
LOAD CSV WITH HEADERS FROM 'file:///rel_compartio.csv' AS row
CALL {
  WITH row
  MATCH (u:Usuario     {usuario_id:     row.usuario_id})
  MATCH (p:Publicacion {publicacion_id: row.publicacion_id})
  MERGE (u)-[r:COMPARTIO]->(p)
  SET r.fecha          = date(row.fecha),
      r.con_comentario = row.con_comentario = 'true',
      r.visibilidad    = row.visibilidad
} IN TRANSACTIONS OF 500 ROWS;

// ESTUDIO_EN
LOAD CSV WITH HEADERS FROM 'file:///rel_estudio_en.csv' AS row
CALL {
  WITH row
  MATCH (u:Usuario   {usuario_id:  row.usuario_id})
  MATCH (e:Educacion {educacion_id: row.educacion_id})
  MERGE (u)-[r:ESTUDIO_EN]->(e)
  SET r.fecha_inicio     = date(row.fecha_inicio),
      r.fecha_graduacion = CASE WHEN row.fecha_graduacion <> '' THEN date(row.fecha_graduacion) ELSE null END,
      r.graduado         = row.graduado = 'true'
} IN TRANSACTIONS OF 500 ROWS;

// POSTULO_A
LOAD CSV WITH HEADERS FROM 'file:///rel_postulo_a.csv' AS row
CALL {
  WITH row
  MATCH (u:Usuario {usuario_id: row.usuario_id})
  MATCH (j:Empleo  {empleo_id:  row.empleo_id})
  MERGE (u)-[r:POSTULO_A]->(j)
  SET r.fecha_postulacion  = date(row.fecha_postulacion),
      r.estado             = row.estado,
      r.carta_presentacion = row.carta_presentacion = 'true'
} IN TRANSACTIONS OF 500 ROWS;

// OFERTA
LOAD CSV WITH HEADERS FROM 'file:///rel_oferta.csv' AS row
CALL {
  WITH row
  MATCH (e:Empresa {empresa_id: row.empresa_id})
  MATCH (j:Empleo  {empleo_id:  row.empleo_id})
  MERGE (e)-[r:OFERTA]->(j)
  SET r.fecha_publicacion = date(row.fecha_publicacion),
      r.urgente           = row.urgente    = 'true',
      r.remunerado        = row.remunerado = 'true'
} IN TRANSACTIONS OF 500 ROWS;

// SIGUE_A
LOAD CSV WITH HEADERS FROM 'file:///rel_sigue_a.csv' AS row
CALL {
  WITH row
  MATCH (u:Usuario {usuario_id: row.usuario_id})
  MATCH (e:Empresa {empresa_id: row.empresa_id})
  MERGE (u)-[r:SIGUE_A]->(e)
  SET r.fecha_seguimiento = date(row.fecha_seguimiento),
      r.notificaciones    = row.notificaciones = 'true',
      r.motivo            = row.motivo
} IN TRANSACTIONS OF 500 ROWS;

// EXPERIENCIA_EN
LOAD CSV WITH HEADERS FROM 'file:///rel_experiencia_en.csv' AS row
CALL {
  WITH row
  MATCH (exp:ExperienciaLaboral {exp_id:    row.exp_id})
  MATCH (e:Empresa              {empresa_id: row.empresa_id})
  MERGE (exp)-[r:EXPERIENCIA_EN]->(e)
  SET r.departamento  = row.departamento,
      r.tipo_contrato = row.tipo_contrato,
      r.modalidad     = row.modalidad
} IN TRANSACTIONS OF 500 ROWS;

// TRABAJO_EN
LOAD CSV WITH HEADERS FROM 'file:///rel_trabajo_en.csv' AS row
CALL {
  WITH row
  MATCH (u:Usuario              {usuario_id: row.usuario_id})
  MATCH (exp:ExperienciaLaboral {exp_id:     row.exp_id})
  MERGE (u)-[r:TRABAJO_EN]->(exp)
  SET r.fecha_inicio = date(row.fecha_inicio),
      r.fecha_fin    = CASE WHEN row.fecha_fin <> '' THEN date(row.fecha_fin) ELSE null END,
      r.verificado   = row.verificado = 'true'
} IN TRANSACTIONS OF 500 ROWS;

// MENCIONA
LOAD CSV WITH HEADERS FROM 'file:///rel_menciona.csv' AS row
CALL {
  WITH row
  MATCH (p:Publicacion {publicacion_id: row.publicacion_id})
  MATCH (u:Usuario     {usuario_id:     row.usuario_id})
  MERGE (p)-[r:MENCIONA]->(u)
  SET r.fecha      = date(row.fecha),
      r.tipo       = row.tipo,
      r.confirmada = row.confirmada = 'true'
} IN TRANSACTIONS OF 500 ROWS;
"""

print(CYPHER)
