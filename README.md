# 💸 App de Organização de Finanças Pessoais da Solange Martins com Vibe Coding
# ORÇANA AI

Projeto desenvolvido como entrega do desafio da DIO na Trilha Santander Lovable para criação de uma aplicação de finanças pessoais com Inteligência Artificial.

---

# Sobre o Projeto

O ORÇANA AI é uma plataforma de organização financeira pessoal baseada em Inteligência Artificial Conversacional.

Seu principal objetivo é simplificar o controle financeiro para usuários iniciantes, eliminando a necessidade de planilhas ou formulários complexos.

Por meio do assistente virtual **Orça**, o usuário pode registrar receitas e despesas, acompanhar metas financeiras, receber diagnósticos inteligentes e obter orientações educativas para melhorar seus hábitos financeiros.

---

# Problema

Muitas pessoas desistem de controlar suas finanças por causa da complexidade dos aplicativos tradicionais.

Os principais desafios observados são:

- excesso de preenchimento manual;
- interfaces complexas;
- pouca personalização;
- dificuldade de manter o hábito de registrar movimentações.

O ORÇANA AI busca resolver esse problema através de uma experiência baseada em conversação.

---

# Proposta de Valor

"Organizar suas finanças nunca foi tão natural."

O usuário se comunica com o sistema da mesma forma que conversa com uma pessoa.

Exemplos:

> "Recebi R$ 700 de freelancer."

> "Gastei R$ 45 no almoço."

> "Quero guardar R$ 300 na minha reserva de emergência."

A IA interpreta o contexto e executa as ações necessárias.

---

# Funcionalidades do MVP

## Registro Financeiro por Conversa

Permite registrar receitas e despesas através de linguagem natural.

## Classificação Automática

Classifica movimentações em categorias como:

- Alimentação
- Transporte
- Moradia
- Saúde
- Educação
- Lazer
- Salário
- Investimentos
- Outros

## Gestão de Metas Financeiras

Criação e acompanhamento de metas como:

- Reserva de Emergência
- Viagem
- Compra de Notebook
- Entrada de Imóvel

## Diagnóstico Financeiro Semanal

Geração automática de insights sobre:

- hábitos de consumo;
- oportunidades de economia;
- evolução financeira;
- progresso das metas.

## Assistente Inteligente Orça

Responsável por:

- interpretar movimentações financeiras;
- gerar orientações educativas;
- acompanhar metas;
- responder dúvidas financeiras básicas.

---

# Hipótese do Produto

Acreditamos que pessoas iniciantes terão mais facilidade para controlar suas finanças utilizando uma interface conversacional baseada em IA do que utilizando formulários tradicionais ou planilhas.

## Evidências observadas durante os testes

- O registro de movimentações foi realizado de forma natural.
- O chat reduziu a necessidade de navegação entre múltiplas telas.
- O acompanhamento de metas ocorreu com baixa curva de aprendizado.
- Os testes revelaram novas regras de negócio importantes para garantir a integridade financeira dos dados.

---

# Demonstração

## Dashboard

<img width="711" height="389" alt="image" src="https://github.com/user-attachments/assets/6ce22b59-9bb5-43ed-aed5-17abd7219d6b" />


## Conversa com o Orça -chat

<img width="370" height="347" alt="image" src="https://github.com/user-attachments/assets/6ed96347-eaa6-4a3f-8008-cf43b4b8b757" />


## Metas Financeiras

<img width="398" height="277" alt="image" src="https://github.com/user-attachments/assets/103e3fe1-8007-46a0-8918-82b3db35e866" />


## Relatórios

<img width="397" height="401" alt="image" src="https://github.com/user-attachments/assets/fa554988-5ef5-4f25-a022-5aef8fb2703e" />
.

---

# PRD (Product Requirements Document)

## Identidade

**Produto:** ORÇANA AI

**Assistente:** Orça – O agente financeiro inteligente

**Público-Alvo:** Usuários iniciantes em educação financeira e pessoas que desejam simplificar o controle das finanças pessoais.

---

## Design Universal

O sistema foi projetado seguindo princípios de Design Universal para garantir acessibilidade e facilidade de uso.

### Diretrizes

- linguagem simples e educativa;
- navegação intuitiva;
- baixo esforço cognitivo;
- alto contraste visual;
- compatibilidade com dispositivos móveis;
- independência de cores para transmissão de informações.

---

## Identidade Visual

### Cor Primária

Azul Petróleo

`#0F4C5C`

### Cor Secundária

Turquesa

`#14B8A6`

### Cor de Destaque

Âmbar

`#F59E0B`

### Fundo

`#F8FAFC`

### Texto

`#334155`

---

## Requisitos Funcionais

### RF01 – Chat Conversacional

Interpretar mensagens em linguagem natural para registrar movimentações financeiras.

### RF02 – Classificação Automática

Categorizar receitas e despesas automaticamente.

### RF03 – Painel Financeiro

Exibir saldo livre, receitas e despesas de forma consolidada.

### RF04 – Gestão de Metas

Permitir cadastro, acompanhamento e evolução de metas financeiras.

### RF05 – Diagnóstico Semanal

Gerar análises sobre hábitos financeiros.

### RF06 – Confirmação de Movimentações

O sistema não deve movimentar dinheiro automaticamente para metas sem autorização explícita do usuário.

### RF07 – Correção e Estorno

Permitir correção, retirada e estorno de valores movimentados incorretamente.

### RF08 – Integridade Financeira

Garantir consistência entre receitas, despesas, aportes e saldo livre.

### RF09 – Formatação Monetária

Utilizar padrão monetário brasileiro em toda a aplicação.

---

# Aprendizados e Reflexões

## O que funcionou bem?

- Construção rápida da interface através do Lovable.
- Aplicação consistente da identidade visual.
- Boa interpretação de linguagem natural pelo Orça.
- Facilidade para evoluir funcionalidades através de prompts.

## O que não funcionou como esperado?

### Movimentação automática de metas

O sistema destinava valores para metas sem confirmação do usuário.

Prompt:Corrigir regras de negócio e experiência conversacional do Orça,Comportamento esperado: Registrar apenas a receita.

Caso exista alguma meta ativa, o Orça deve perguntar:

"Deseja adicionar algum valor dessa receita à sua meta Reserva de Emergência?"

Implementado a regra RF06 exigindo confirmação explícita.

### Inconsistência entre saldo e metas

Metas eram atualizadas sem refletir no saldo disponível, IA não tinha permissão.

Prompt: Regra obrigatória: Saldo Atual/Livre = (Total de Receitas) - (Total de Despesas) - (Total Aportado em Metas Ativas).

Se o usuário tem R$ 700,00 de receita e aportou R$ 650,00 na Reserva, o Saldo Atual deve exibir obrigatoriamente R$ 50,00.

Se o usuário retirar ou estornar da meta, o valor deve voltar imediatamente para o Saldo Atual.

Dê permissão/ferramenta ao agente Orça para que ele possa sincronizar e ajustar esse vínculo pelo próprio chat sem pedir para "falar com o suporte

Implementação da regra de integridade financeira.

### Formatação monetária

Alguns campos permitiam entrada de valores sem máscara.

Prompt:No campo "Orçamento mensal (R$)" no Perfil e nos campos de input de valores (como o "Guardar R$" nas Metas):

Adicionar máscara automática de moeda brasileira enquanto o usuário digita: ao digitar 3000, exibir automaticamente "R$ 3.000,00".

Salvar no banco o valor numérico correto (3000.00).

Padronização para formato brasileiro (BRL).

### Ordenação do histórico do chat

Foram identificados comportamentos inconsistentes na sequência das mensagens.

Prompt:Validar:

Ordenação por created_at ASC.
Persistência correta dos timestamps.
Duplicação por atualização otimista.
Re-renderização do histórico.
O histórico deve sempre respeitar a sequência temporal correta da conversa.

Ajuste da ordenação cronológica das conversas.

---

## O que aprendi sobre conversar com IAs?

### A IA precisa de regras explícitas

Quanto mais claras forem as restrições e regras de negócio, mais confiável será o comportamento do sistema.

### Engenharia de Prompt é iterativa

O desenvolvimento aconteceu através de ciclos contínuos:

Planejamento → Prompt → Testes → Ajustes → Refinamento.

### IA acelera o desenvolvimento, mas não substitui validação

Os testes práticos foram fundamentais para identificar problemas que não eram visíveis apenas analisando o código ou os prompts.

---


- Meu **prompt final** (PRD) refinado no google Antigravity e copilot; 
# PRD (Prompt Final Utilizado no Projeto)

> O documento abaixo representa a versão final do Product Requirements Document utilizado para orientar a construção e evolução do ORÇANA AI.

```prompt
[# Contexto
Quero criar um aplicativo de Organização de Finanças Pessoais que funcione por meio de conversas com o usuário.

# Problema
Muitas pessoas desistem de controlar seus gastos...

# Público-Alvo
Pessoas que querem começar a organizar suas finanças...

# Funcionalidades-Chave
1. Registrar gastos via chat...
2. Classificar automaticamente...
3. Definir e acompanhar metas...
4. Receber dicas de economia...
5. Visualizar relatórios simples...

# Entregável da IA
Gerar um plano de MVP...]
  
  
  -
# Limitações Atuais do MVP

Por se tratar de um MVP, algumas funcionalidades ainda não foram implementadas:

- integração com Open Finance;
- sincronização bancária automática;
- importação de extratos;
- aplicativo mobile nativo;
- relatórios financeiros avançados;
- múltiplas carteiras financeiras.

---

# Tecnologias Utilizadas

- Lovable
- React
- Vite
- Tailwind CSS
- Supabase
- Inteligência Artificial Conversacional
- GitHub

---
Organizar suas finanças nunca foi tão natural.
Aplicação Web: https://orcana.lovable.app/
Repositório: https://github.com/solangemartins/orcana-ai)

# Autor

Solange Martins

Projeto desenvolvido para o desafio da DIO utilizando IA Generativa, Engenharia de Prompt e desenvolvimento assistido por Inteligência Artificial.
