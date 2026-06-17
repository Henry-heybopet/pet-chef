import { adminModules, adminRoles, priorityLabels } from './adminModules';

const statusMetrics = [
  { label: '后台模块', value: adminModules.length, note: '覆盖核心运营域' },
  { label: 'P0 模块', value: adminModules.filter(module => module.priority === 'P0').length, note: '首版优先实现' },
  { label: '权限角色', value: adminRoles.length, note: '用于后续 RBAC' },
  { label: '真实接口', value: 0, note: '当前仅静态骨架' },
];

function App() {
  const p0Modules = adminModules.filter(module => module.priority === 'P0');
  const p1Modules = adminModules.filter(module => module.priority === 'P1');

  return (
    <main className="admin-shell">
      <aside className="sidebar">
        <div>
          <div className="brand-mark">HB</div>
          <h1>Heybo Pet Admin</h1>
          <p>管理用户、宠物、设备、食谱、商品、订单、医疗资料、医生审核与故障日志的内部控制台。</p>
        </div>

        <nav aria-label="后台模块">
          {adminModules.map(module => (
            <a key={module.id} href={`#${module.id}`}>
              <span>{module.name}</span>
              <strong>{module.priority}</strong>
            </a>
          ))}
        </nav>
      </aside>

      <section className="workspace">
        <header className="page-header">
          <div>
            <p className="eyebrow">Admin Console Skeleton</p>
            <h2>模块总览仪表盘</h2>
          </div>
          <div className="mode-pill">Mock only</div>
        </header>

        <section className="metric-grid" aria-label="后台状态摘要">
          {statusMetrics.map(metric => (
            <article className="metric-card" key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <p>{metric.note}</p>
            </article>
          ))}
        </section>

        <section className="section-block">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Version 1 Priority</p>
              <h3>P0 优先模块</h3>
            </div>
            <span>{priorityLabels.P0}</span>
          </div>

          <div className="module-grid">
            {p0Modules.map(module => (
              <ModuleCard key={module.id} module={module} />
            ))}
          </div>
        </section>

        <section className="section-block">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Next Wave</p>
              <h3>P1 占位模块</h3>
            </div>
            <span>{priorityLabels.P1}</span>
          </div>

          <div className="module-grid compact">
            {p1Modules.map(module => (
              <ModuleCard key={module.id} module={module} />
            ))}
          </div>
        </section>

        <section className="section-block">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Access Model</p>
              <h3>权限角色草案</h3>
            </div>
          </div>

          <div className="role-list">
            {adminRoles.map(role => (
              <article key={role.id}>
                <strong>{role.name}</strong>
                <p>{role.scope}</p>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

function ModuleCard({ module }) {
  return (
    <article className="module-card" id={module.id}>
      <div className="module-card-header">
        <span className={`priority-badge ${module.priority.toLowerCase()}`}>{module.priority}</span>
        <span className="role-badge">{module.ownerRole}</span>
      </div>
      <h4>{module.name}</h4>
      <p>{module.summary}</p>
      <ul>
        {module.firstVersion.map(item => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  );
}

export default App;
