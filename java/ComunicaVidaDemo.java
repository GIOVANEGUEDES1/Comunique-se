import java.util.ArrayList;
import java.util.List;
import java.util.Scanner;

/**
 * Demonstração didática independente do aplicativo web COMUNIQUE-SE.
 * Este arquivo serve para estudar lógica básica em Java no terminal.
 */
public class ComunicaVidaDemo {
    static class Familiar {
        String nome;
        String parentesco;
        Familiar(String nome, String parentesco) {
            this.nome = nome;
            this.parentesco = parentesco;
        }
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        List<Familiar> familiares = new ArrayList<>();

        System.out.println("=== COMUNIQUE-SE — demonstração Java ===");
        System.out.println("1. Comunicar preferência de café");
        System.out.println("2. Cadastrar familiar demonstrativo");
        System.out.println("3. Exibir mensagem de ajuda");
        System.out.print("Escolha uma opção: ");
        String opcao = scanner.nextLine().trim();

        switch (opcao) {
            case "1":
                System.out.print("Como deseja o café? (mais quente, mais frio, mais leite, menos açúcar): ");
                String ajuste = scanner.nextLine().trim();
                System.out.println("Mensagem: Quero café. " + ajuste + ".");
                break;
            case "2":
                System.out.print("Nome do familiar: ");
                String nome = scanner.nextLine().trim();
                System.out.print("Parentesco/relação: ");
                String parentesco = scanner.nextLine().trim();
                familiares.add(new Familiar(nome, parentesco));
                System.out.println("Cadastro demonstrativo salvo apenas durante esta execução: "
                        + familiares.get(0).nome + " (" + familiares.get(0).parentesco + ").");
                break;
            case "3":
                System.out.println("Mensagem: Preciso de ajuda agora.");
                break;
            default:
                System.out.println("Opção não reconhecida. Execute novamente e escolha 1, 2 ou 3.");
        }
        scanner.close();
    }
}
