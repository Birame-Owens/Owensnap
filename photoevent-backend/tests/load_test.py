"""
Tests de charge avec simulation de 100 utilisateurs
Mesure les performances du système sous charge
"""
import asyncio
import time
import statistics
from typing import List, Dict
import httpx
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
from datetime import datetime
import base64
from PIL import Image
import io

class LoadTester:
    """Test de charge pour Owen'Snap"""
    
    def __init__(
        self, 
        base_url: str = "http://localhost:8000",
        num_users: int = 100,
        requests_per_user: int = 10
    ):
        self.base_url = base_url
        self.num_users = num_users
        self.requests_per_user = requests_per_user
        self.results = {
            "search_times": [],
            "upload_times": [],
            "errors": [],
            "status_codes": {}
        }
    
    @staticmethod
    def create_test_image(size: int = 300) -> str:
        """Créer une image de test en base64"""
        image = Image.new('RGB', (size, size), color='red')
        buffer = io.BytesIO()
        image.save(buffer, format='JPEG', quality=80)
        return base64.b64encode(buffer.getvalue()).decode()
    
    def test_search_endpoint(self, event_id: str, image_b64: str) -> Dict:
        """Tester l'endpoint de recherche faciale"""
        start_time = time.time()
        
        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.post(
                    f"{self.base_url}/api/search/face",
                    json={
                        "event_id": event_id,
                        "face_image": image_b64
                    }
                )
            
            elapsed = time.time() - start_time
            
            return {
                "status_code": response.status_code,
                "elapsed_time": elapsed,
                "success": response.status_code == 200,
                "error": None
            }
        
        except Exception as e:
            elapsed = time.time() - start_time
            return {
                "status_code": 0,
                "elapsed_time": elapsed,
                "success": False,
                "error": str(e)
            }
    
    def test_upload_endpoint(self, event_id: str, image_b64: str) -> Dict:
        """Tester l'endpoint d'upload de photos"""
        start_time = time.time()
        
        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.post(
                    f"{self.base_url}/api/photos",
                    json={
                        "event_id": event_id,
                        "photo_base64": image_b64,
                        "photographer_id": "test_user"
                    }
                )
            
            elapsed = time.time() - start_time
            
            return {
                "status_code": response.status_code,
                "elapsed_time": elapsed,
                "success": response.status_code in [200, 201],
                "error": None
            }
        
        except Exception as e:
            elapsed = time.time() - start_time
            return {
                "status_code": 0,
                "elapsed_time": elapsed,
                "success": False,
                "error": str(e)
            }
    
    async def run_user_simulation(self, user_id: int, event_id: str = "JK0LHAWK"):
        """Simuler un utilisateur qui fait des requêtes"""
        test_image = self.create_test_image()
        
        for request_num in range(self.requests_per_user):
            # Alterner entre upload et search
            if request_num % 2 == 0:
                result = self.test_upload_endpoint(event_id, test_image)
            else:
                result = self.test_search_endpoint(event_id, test_image)
            
            # Enregistrer les résultats
            if result["success"]:
                if request_num % 2 == 0:
                    self.results["upload_times"].append(result["elapsed_time"])
                else:
                    self.results["search_times"].append(result["elapsed_time"])
            else:
                self.results["errors"].append({
                    "user_id": user_id,
                    "error": result["error"]
                })
            
            # Enregistrer le code de statut
            status = result["status_code"]
            self.results["status_codes"][status] = self.results["status_codes"].get(status, 0) + 1
            
            # Petit délai pour éviter de surcharger
            await asyncio.sleep(0.1)
    
    def run_load_test(self) -> Dict:
        """Exécuter le test de charge complet"""
        print(f"\n🚀 Démarrage du test de charge")
        print(f"   - {self.num_users} utilisateurs simulés")
        print(f"   - {self.requests_per_user} requêtes par utilisateur")
        print(f"   - Total: {self.num_users * self.requests_per_user} requêtes\n")
        
        start_time = time.time()
        
        # Utiliser ThreadPoolExecutor pour paralléliser
        with ThreadPoolExecutor(max_workers=min(50, self.num_users)) as executor:
            futures = [
                executor.submit(
                    self._run_user_sync,
                    user_id
                )
                for user_id in range(self.num_users)
            ]
            
            completed = 0
            for future in as_completed(futures):
                completed += 1
                if completed % 10 == 0:
                    print(f"✓ {completed}/{self.num_users} utilisateurs traités")
                try:
                    future.result()
                except Exception as e:
                    self.results["errors"].append({"error": str(e)})
        
        total_time = time.time() - start_time
        
        # Générer le rapport
        return self.generate_report(total_time)
    
    def _run_user_sync(self, user_id: int):
        """Wrapper synchrone pour la simulation utilisateur"""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(self.run_user_simulation(user_id))
        finally:
            loop.close()
    
    def generate_report(self, total_time: float) -> Dict:
        """Générer le rapport des tests"""
        search_times = self.results["search_times"]
        upload_times = self.results["upload_times"]
        
        report = {
            "timestamp": datetime.now().isoformat(),
            "test_configuration": {
                "num_users": self.num_users,
                "requests_per_user": self.requests_per_user,
                "total_requests": self.num_users * self.requests_per_user
            },
            "overall_stats": {
                "total_time_seconds": round(total_time, 2),
                "requests_per_second": round(
                    (self.num_users * self.requests_per_user) / total_time, 2
                ),
                "total_errors": len(self.results["errors"]),
                "error_rate_percent": round(
                    (len(self.results["errors"]) / (self.num_users * self.requests_per_user)) * 100, 2
                )
            },
            "status_codes": self.results["status_codes"],
            "search_endpoint": self._calculate_stats(search_times, "Search API"),
            "upload_endpoint": self._calculate_stats(upload_times, "Upload API"),
            "errors": self.results["errors"][:10]  # Montrer les 10 premiers erreurs
        }
        
        self._print_report(report)
        return report
    
    @staticmethod
    def _calculate_stats(times: List[float], endpoint_name: str) -> Dict:
        """Calculer les statistiques pour un endpoint"""
        if not times:
            return {
                "endpoint": endpoint_name,
                "requests": 0,
                "message": "Aucune requête réussie"
            }
        
        times_ms = [t * 1000 for t in times]
        
        return {
            "endpoint": endpoint_name,
            "requests": len(times),
            "min_ms": round(min(times_ms), 2),
            "max_ms": round(max(times_ms), 2),
            "avg_ms": round(statistics.mean(times_ms), 2),
            "median_ms": round(statistics.median(times_ms), 2),
            "p95_ms": round(statistics.quantiles(times_ms, n=20)[18] if len(times_ms) > 20 else max(times_ms), 2),
            "p99_ms": round(statistics.quantiles(times_ms, n=100)[98] if len(times_ms) > 100 else max(times_ms), 2),
            "std_dev_ms": round(statistics.stdev(times_ms), 2) if len(times_ms) > 1 else 0
        }
    
    def _print_report(self, report: Dict):
        """Afficher le rapport formaté"""
        print("\n" + "="*70)
        print("📊 RAPPORT DE TEST DE CHARGE - Owen'Snap")
        print("="*70)
        
        print(f"\n⏱️  Temps total: {report['overall_stats']['total_time_seconds']}s")
        print(f"📈 Débit: {report['overall_stats']['requests_per_second']} req/s")
        print(f"❌ Erreurs: {report['overall_stats']['total_errors']} ({report['overall_stats']['error_rate_percent']}%)")
        
        print(f"\n🔍 {report['search_endpoint']['endpoint']}:")
        if report['search_endpoint'].get('requests', 0) > 0:
            print(f"   - Requêtes: {report['search_endpoint']['requests']}")
            print(f"   - Min: {report['search_endpoint']['min_ms']}ms")
            print(f"   - Avg: {report['search_endpoint']['avg_ms']}ms")
            print(f"   - Median: {report['search_endpoint']['median_ms']}ms")
            print(f"   - P95: {report['search_endpoint']['p95_ms']}ms")
            print(f"   - P99: {report['search_endpoint']['p99_ms']}ms")
            print(f"   - Max: {report['search_endpoint']['max_ms']}ms")
        else:
            print(f"   - {report['search_endpoint'].get('message', 'N/A')}")
        
        print(f"\n📤 {report['upload_endpoint']['endpoint']}:")
        if report['upload_endpoint'].get('requests', 0) > 0:
            print(f"   - Requêtes: {report['upload_endpoint']['requests']}")
            print(f"   - Min: {report['upload_endpoint']['min_ms']}ms")
            print(f"   - Avg: {report['upload_endpoint']['avg_ms']}ms")
            print(f"   - Median: {report['upload_endpoint']['median_ms']}ms")
            print(f"   - P95: {report['upload_endpoint']['p95_ms']}ms")
            print(f"   - P99: {report['upload_endpoint']['p99_ms']}ms")
            print(f"   - Max: {report['upload_endpoint']['max_ms']}ms")
        else:
            print(f"   - {report['upload_endpoint'].get('message', 'N/A')}")
        
        print(f"\n📊 Codes de statut:")
        for code, count in sorted(report['status_codes'].items()):
            print(f"   - {code}: {count}")
        
        print("\n" + "="*70)

def main():
    """Exécuter le test de charge"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Test de charge Owen'Snap")
    parser.add_argument("--users", type=int, default=100, help="Nombre d'utilisateurs")
    parser.add_argument("--requests", type=int, default=10, help="Requêtes par utilisateur")
    parser.add_argument("--url", default="http://localhost:8000", help="URL de base")
    
    args = parser.parse_args()
    
    tester = LoadTester(
        base_url=args.url,
        num_users=args.users,
        requests_per_user=args.requests
    )
    
    report = tester.run_load_test()
    
    # Sauvegarder le rapport
    with open("load_test_report.json", "w") as f:
        json.dump(report, f, indent=2)
    
    print(f"\n✅ Rapport sauvegardé dans load_test_report.json")

if __name__ == "__main__":
    main()
