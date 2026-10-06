# Especificação - Document Management System

## 1. Objetivo

Permitir que usuários enviem, listem e baixem seus documentos, armazenados no filesystem local da aplicação, com metadados mantidos em memória.

## 2. Escopo

### Dentro do escopo

- Upload de um arquivo por requisição.
- Listagem dos documentos associados ao usuário da requisição.
- Download de um documento pelo identificador, restrito ao dono.
- Gravação dos arquivos em disco local via `multer` com `diskStorage`.
- Metadados mantidos em memória durante a execução do backend.
- Interface React para upload, listagem e download.
- Configuração do backend por variáveis de ambiente.

### Fora do escopo

- Armazenamento externo ou em nuvem.
- Banco de dados ou persistência dos metadados após reinicialização.
- Versionamento, edição ou exclusão de documentos.
- Autenticação, cadastro de usuários ou recuperação de identidade.
- Compartilhamento entre usuários, pré-visualização ou conversão de arquivos.

## 3. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF-01 | O usuário pode enviar um arquivo em `multipart/form-data`, no campo `file`. |
| RF-02 | O upload associa o documento ao usuário identificado na requisição. |
| RF-03 | O servidor gera um identificador único e um nome interno aleatório para o arquivo. |
| RF-04 | O sistema registra os metadados em memória e retorna os dados públicos do documento. |
| RF-05 | O usuário pode listar somente os documentos associados ao seu identificador. |
| RF-06 | O usuário pode baixar um documento pelo identificador se for seu dono. |
| RF-07 | O sistema informa erros apropriados quando faltam usuário ou arquivo, quando o limite é excedido, ou quando o documento/arquivo não existe. |
| RF-08 | O download sugere o nome original ao navegador, sem usar esse nome como caminho no filesystem. |
| RF-09 | A interface permite selecionar e enviar um arquivo, acompanhar o envio, listar documentos e iniciar downloads. |
| RF-10 | A interface apresenta erros de API sem ocultar a lista de documentos carregada. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos são gravados localmente com `multer` e `diskStorage`, em `backend/storage` por padrão. |
| RNF-02 | `UPLOAD_DIR` permite configurar o diretório de gravação. |
| RNF-03 | Os metadados são mantidos em memória e se perdem ao reiniciar o processo; arquivos podem permanecer no disco sem metadados associados. |
| RNF-04 | O tamanho máximo padrão é 10 MiB, configurável por `UPLOAD_MAX_SIZE_BYTES`. |
| RNF-05 | A porta do backend é configurável por `PORT`, com padrão `3000`. |
| RNF-06 | Respostas não expõem caminhos internos do filesystem nem o nome interno de armazenamento. |
| RNF-07 | Erros da API usam JSON no formato definido nesta especificação, exceto respostas binárias de download bem-sucedidas. |
| RNF-08 | O backend segue o fluxo `routes -> controllers -> services -> repositories`. |
| RNF-09 | O frontend chama a API por `/api`; o proxy de desenvolvimento do Vite remove esse prefixo antes de encaminhar ao backend. |

## 5. Identidade do usuário

Como não há autenticação nesta fase, os endpoints de documentos recebem o identificador pelo cabeçalho `X-User-Id`.

- O cabeçalho é obrigatório e deve conter uma string não vazia com até 100 caracteres.
- Listagem e download são filtrados pelo valor recebido.
- Esse cabeçalho é somente um mecanismo provisório de isolamento funcional; não comprova identidade e não é adequado como autenticação em produção.
- Autenticação real e obtenção do identificador a partir de sessão ou token ficam fora do escopo.

## 6. Modelo de dados

### Documento (metadados em memória)

| Campo | Tipo | Público | Descrição |
| --- | --- | --- | --- |
| `id` | string | Sim | UUID gerado pelo servidor. |
| `originalName` | string | Sim | Nome original enviado pelo cliente. |
| `size` | number | Sim | Tamanho do arquivo em bytes. |
| `uploadedAt` | string | Sim | Data/hora de criação em ISO 8601 UTC. |
| `owner` | string | Sim | Identificador recebido no cabeçalho `X-User-Id`. |
| `contentType` | string | Sim | Tipo MIME informado no upload. |
| `storageName` | string | Não | Nome UUID usado internamente para localizar o arquivo. |

Os metadados são indexados por `id`. Caminhos absolutos não fazem parte do modelo público; o repositório combina o diretório configurado com `storageName` para acessar o arquivo.

## 7. Contratos de API

As rotas do backend não têm prefixo `/api`. O frontend usa o proxy do Vite em desenvolvimento, por exemplo `/api/documents`.

### Formato de erro

    {
      "error": {
        "code": "FILE_REQUIRED",
        "message": "Envie um arquivo no campo file."
      }
    }

`code` é estável para tratamento pelo cliente; `message` é legível e não deve incluir detalhes internos.

### POST /upload

- Cabeçalho obrigatório: `X-User-Id`.
- Entrada: `multipart/form-data` com um único arquivo no campo `file`.
- Limite: `UPLOAD_MAX_SIZE_BYTES` (10 MiB por padrão).
- Sucesso: `201 Created`.

    {
      "document": {
        "id": "uuid",
        "originalName": "relatorio.pdf",
        "size": 12345,
        "uploadedAt": "2026-10-06T12:00:00.000Z",
        "owner": "usuario-1",
        "contentType": "application/pdf"
      }
    }

- Erros: `400 INVALID_USER`, `400 FILE_REQUIRED`, `400 UPLOAD_FAILED`, `413 FILE_TOO_LARGE`, `500 INTERNAL_ERROR`.

### GET /documents

- Cabeçalho obrigatório: `X-User-Id`.
- Retorna os documentos do dono, do mais recente ao mais antigo; se não houver documentos, retorna uma lista vazia.
- Sucesso: `200 OK`.

    {
      "documents": [
        {
          "id": "uuid",
          "originalName": "relatorio.pdf",
          "size": 12345,
          "uploadedAt": "2026-10-06T12:00:00.000Z",
          "owner": "usuario-1",
          "contentType": "application/pdf"
        }
      ]
    }

- Erros: `400 INVALID_USER`, `500 INTERNAL_ERROR`.

### GET /documents/:id/download

- Cabeçalho obrigatório: `X-User-Id`.
- Sucesso: `200 OK`, conteúdo binário com `Content-Disposition: attachment` e nome original sugerido ao cliente.
- Documento inexistente ou pertencente a outro usuário: `404 DOCUMENT_NOT_FOUND`, com resposta idêntica nos dois casos.
- Metadados existentes com arquivo ausente no disco: `404 FILE_NOT_FOUND`.
- Erros: `400 INVALID_USER`, `404 DOCUMENT_NOT_FOUND`, `404 FILE_NOT_FOUND`, `500 DOWNLOAD_FAILED` ou `500 INTERNAL_ERROR` antes do início da resposta binária.

## 8. Decisões arquiteturais

- `routes/` declara endpoints e conecta middleware/controllers.
- `controllers/` valida a entrada HTTP e serializa respostas.
- `services/` concentra criação dos metadados, filtragem por dono e autorização do download.
- `repositories/` mantém metadados em memória e localiza arquivos no disco.
- Middleware de upload usa `multer` com `diskStorage`; nomes internos UUID não dependem do nome enviado pelo cliente.
- O frontend usa componentes React e serviço com `fetch` para consumir a API.
- Os endpoints permanecem sem prefixo `/api`; o proxy Vite reescreve o caminho em desenvolvimento.
- Respostas para documento alheio e inexistente são indistinguíveis para não revelar documentos de outros usuários.

## 9. Plano de execução

1. Registrar esta especificação em `docs/specs/dms-spec.md` e revisar requisitos, modelo, contratos e restrições.
2. Implementar o backend em camadas: upload local com limite configurável, metadados em memória, listagem e download autorizado; cobrir os contratos com testes HTTP.
3. Implementar a interface React e o serviço de API para selecionar/enviar arquivo, listar documentos e baixar conteúdo, incluindo estados de carregamento e erro.
4. Validar integração e cenários de borda: cabeçalho/arquivo ausentes, limite excedido, isolamento por usuário, documento inexistente e arquivo ausente no disco.

Critérios de aceite: arquivos permanecem no filesystem local via Multer; metadados não são persistidos fora da memória; os endpoints seguem os contratos acima; a interface usa `/api`; testes de backend e build do frontend passam.