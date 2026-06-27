import {
  adminReports, adminResolveReport, adminDeleteReview,
  adminPublishReview, adminHideReview, adminReviews,
} from '../../api.js';
import { isAdmin } from '../../state.js';
import { navigate } from '../../router.js';
import { toastOk, toastError } from '../../components/toast.js';
import { confirmDialog } from '../../components/modal.js';
import { _renderAdminNav } from './dashboard.js';

export async function adminModerationPage() {
  if (!isAdmin()) { navigate('/admin/login'); return document.createElement('div'); }

  const root = document.createElement('div');
  root.className = 'admin-layout';
  _renderAdminNav(root, 'moderation');

  const main = document.createElement('main');
  main.className = 'admin-main';

  const header = document.createElement('div');
  header.className = 'page-header';
  const h1 = document.createElement('h1');
  h1.textContent = 'Moderação';
  header.appendChild(h1);
  main.appendChild(header);

  const tabs = document.createElement('div');
  tabs.className = 'tab-bar';
  const tabReports = document.createElement('button');
  tabReports.className = 'tab active';
  tabReports.textContent = 'Reportes';
  tabReports.setAttribute('aria-selected', 'true');
  const tabReviews = document.createElement('button');
  tabReviews.className = 'tab';
  tabReviews.textContent = 'Avaliações ocultas';
  tabReviews.setAttribute('aria-selected', 'false');
  tabs.append(tabReports, tabReviews);
  main.appendChild(tabs);

  const content = document.createElement('div');
  main.appendChild(content);
  root.appendChild(main);

  async function showReports() {
    tabReports.classList.add('active');
    tabReports.setAttribute('aria-selected', 'true');
    tabReviews.classList.remove('active');
    tabReviews.setAttribute('aria-selected', 'false');
    content.replaceChildren();

    const loading = document.createElement('p');
    loading.className = 'text-muted';
    loading.textContent = 'Carregando reportes…';
    content.appendChild(loading);

    try {
      const data = await adminReports({ status: 'open' });
      content.replaceChildren();

      if (!data?.items?.length) {
        const empty = document.createElement('p');
        empty.className = 'text-muted empty-state';
        empty.textContent = 'Nenhum reporte aberto. 🎉';
        content.appendChild(empty);
        return;
      }

      const table = document.createElement('table');
      table.className = 'data-table';
      const thead = document.createElement('thead');
      const trh = document.createElement('tr');
      for (const col of ['Avaliação', 'Motivo', 'Reportado por', 'Data', 'Ações']) {
        const th = document.createElement('th');
        th.textContent = col;
        trh.appendChild(th);
      }
      thead.appendChild(trh);
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      for (const report of data.items) {
        const tr = document.createElement('tr');
        const tdReview = document.createElement('td');
        tdReview.textContent = `Review #${report.review_id}`;
        const tdReason = document.createElement('td');
        tdReason.textContent = report.reason || '—';
        const tdBy = document.createElement('td');
        tdBy.textContent = report.reporter_username || '—';
        const tdDate = document.createElement('td');
        tdDate.textContent = new Date(report.created_at).toLocaleDateString('pt-BR');
        const tdActs = document.createElement('td');

        const dismissBtn = document.createElement('button');
        dismissBtn.className = 'btn btn-ghost btn-sm';
        dismissBtn.textContent = 'Dispensar';
        dismissBtn.addEventListener('click', async () => {
          try {
            await adminResolveReport(report.id, 'dismissed');
            tr.style.opacity = '0.4';
            setTimeout(() => tr.remove(), 300);
            toastOk('Reporte dispensado.');
          } catch (e) { toastError(e.message); }
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger btn-sm';
        deleteBtn.textContent = 'Excluir avaliação';
        deleteBtn.addEventListener('click', () => {
          confirmDialog('Excluir a avaliação reportada?', async () => {
            try {
              await adminDeleteReview(report.review_id);
              await adminResolveReport(report.id, 'resolved');
              tr.style.opacity = '0.4';
              setTimeout(() => tr.remove(), 300);
              toastOk('Avaliação excluída.');
            } catch (e) { toastError(e.message); }
          }, { title: 'Confirmar exclusão', danger: true, confirmLabel: 'Excluir' });
        });

        const hideBtn = document.createElement('button');
        hideBtn.className = 'btn btn-ghost btn-sm';
        hideBtn.textContent = 'Ocultar avaliação';
        hideBtn.addEventListener('click', async () => {
          try {
            await adminHideReview(report.review_id);
            await adminResolveReport(report.id, 'resolved');
            tr.style.opacity = '0.4';
            setTimeout(() => tr.remove(), 300);
            toastOk('Avaliação ocultada.');
          } catch (e) { toastError(e.message); }
        });

        tdActs.append(dismissBtn, hideBtn, deleteBtn);
        tr.append(tdReview, tdReason, tdBy, tdDate, tdActs);
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      content.appendChild(table);
    } catch (e) {
      content.replaceChildren();
      const errEl = document.createElement('p');
      errEl.className = 'text-muted';
      errEl.textContent = `Erro: ${e.message}`;
      content.appendChild(errEl);
    }
  }

  async function showHiddenReviews() {
    tabReviews.classList.add('active');
    tabReviews.setAttribute('aria-selected', 'true');
    tabReports.classList.remove('active');
    tabReports.setAttribute('aria-selected', 'false');
    content.replaceChildren();

    const loading = document.createElement('p');
    loading.className = 'text-muted';
    loading.textContent = 'Carregando avaliações ocultas…';
    content.appendChild(loading);

    try {
      const data = await adminReviews({ status: 'hidden' });
      content.replaceChildren();

      if (!data?.items?.length) {
        const empty = document.createElement('p');
        empty.className = 'text-muted empty-state';
        empty.textContent = 'Nenhuma avaliação está oculta.';
        content.appendChild(empty);
        return;
      }

      const table = document.createElement('table');
      table.className = 'data-table';
      const thead = document.createElement('thead');
      const trh = document.createElement('tr');
      for (const col of ['Autor', 'Filme', 'Nota', 'Prévia', 'Ações']) {
        const th = document.createElement('th');
        th.textContent = col;
        trh.appendChild(th);
      }
      thead.appendChild(trh);
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      for (const review of data.items) {
        const tr = document.createElement('tr');
        const tdAuthor = document.createElement('td');
        tdAuthor.textContent = review.author_name || '—';
        const tdMovie = document.createElement('td');
        tdMovie.textContent = review.movie_title || `#${review.movie_id}`;
        const tdRating = document.createElement('td');
        tdRating.textContent = `★ ${Number(review.rating).toFixed(1)}`;
        const tdPreview = document.createElement('td');
        tdPreview.textContent = review.body ? review.body.slice(0, 80) + (review.body.length > 80 ? '…' : '') : '—';
        const tdActs = document.createElement('td');

        const publishBtn = document.createElement('button');
        publishBtn.className = 'btn btn-ghost btn-sm';
        publishBtn.textContent = 'Publicar';
        publishBtn.addEventListener('click', async () => {
          try {
            await adminPublishReview(review.id);
            tr.style.opacity = '0.4';
            setTimeout(() => tr.remove(), 300);
            toastOk('Avaliação publicada.');
          } catch (e) { toastError(e.message); }
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger btn-sm';
        deleteBtn.textContent = 'Excluir';
        deleteBtn.addEventListener('click', () => {
          confirmDialog('Excluir esta avaliação?', async () => {
            try {
              await adminDeleteReview(review.id);
              tr.style.opacity = '0.4';
              setTimeout(() => tr.remove(), 300);
              toastOk('Avaliação excluída.');
            } catch (e) { toastError(e.message); }
          }, { title: 'Confirmar exclusão', danger: true, confirmLabel: 'Excluir' });
        });

        tdActs.append(publishBtn, deleteBtn);
        tr.append(tdAuthor, tdMovie, tdRating, tdPreview, tdActs);
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      content.appendChild(table);
    } catch (e) {
      content.replaceChildren();
      const errEl = document.createElement('p');
      errEl.className = 'text-muted';
      errEl.textContent = `Erro: ${e.message}`;
      content.appendChild(errEl);
    }
  }

  tabReports.addEventListener('click', showReports);
  tabReviews.addEventListener('click', showHiddenReviews);
  showReports();

  return root;
}
