import {
  AlertCircle,
  Check,
  ChevronDown,
  CircleOff,
  Edit3,
  Eye,
  EyeOff,
  LoaderCircle,
  Plus,
  Save,
  Search,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { formatMoney } from "../../lib/format";
import { isRoshCategory as categoryIsRosh } from "../../lib/catalog";
import { catalogImage } from "../../lib/images";
import { apiErrorMessage } from "../../services/api";
import { ProductPhotoInput } from "./ProductPhotoInput";
import { getCategories, type Category } from "../../services/categories";
import { getBrands, type Brand } from "../../services/brands";
import { getFlavors, type Flavor } from "../../services/flavors";
import {
  createProduct,
  getProducts,
  updateProduct,
  updateProductStatus,
  type Product,
} from "../../services/products";

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [flavorId, setFlavorId] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null | undefined>();
  const [editImageBase64, setEditImageBase64] = useState<string | null | undefined>();
  const [photoBusy, setPhotoBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [listOpen, setListOpen] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getProducts(), getCategories(), getBrands(), getFlavors()])
      .then(
        ([loadedProducts, loadedCategories, loadedBrands, loadedFlavors]) => {
          setProducts(loadedProducts);
          const activeCategories = loadedCategories.filter(
            (category) => category.active,
          );
          setCategories(loadedCategories);
          setBrands(loadedBrands);
          setFlavors(loadedFlavors);
          setCategoryId(activeCategories[0]?.id ?? "");
          setBrandId(loadedBrands.find((brand) => brand.active)?.id ?? "");
        },
      )
      .catch(() => setError("Não foi possível carregar produtos e categorias."))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !categoryId ||
      (!isRoshCategory && !name.trim()) ||
      (isRoshCategory && !flavorId) ||
      !price ||
      photoBusy
    )
      return;

    setIsSaving(true);
    setError("");
    try {
      const product = await createProduct({
        category_id: categoryId,
        flavor_id: isRoshCategory ? flavorId : undefined,
        name: isRoshCategory ? "Rosh" : name.trim(),
        price: price.replace(",", "."),
        description: description.trim() || undefined,
        image_base64: imageBase64,
      });
      setProducts((current) => [...current, product]);
      setName("");
      setPrice("");
      setDescription("");
      setFlavorId("");
      setImageBase64(undefined);
    } catch (err) {
      setError(
        apiErrorMessage(err, "Não foi possível criar o produto. Confira a categoria, o preço e a foto."),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusChange(product: Product) {
    setUpdatingId(product.id);
    setError("");
    try {
      const updatedProduct = await updateProductStatus(
        product.id,
        !product.active,
      );
      setProducts((current) =>
        current.map((item) => (item.id === product.id ? updatedProduct : item)),
      );
    } catch {
      setError("Não foi possível atualizar o status do produto.");
    } finally {
      setUpdatingId(null);
    }
  }

  function startEditing(product: Product) {
    setEditingId(product.id);
    setEditName(product.name);
    setEditPrice(product.price);
    setEditDescription(product.description ?? "");
    setEditImageBase64(undefined);
  }

  async function saveProduct(product: Product) {
    if (photoBusy || !editName.trim() || !editPrice) return;
    setUpdatingId(product.id);
    setError("");
    try {
      const updated = await updateProduct(product.id, {
        name: editName.trim(),
        price: editPrice.replace(",", "."),
        description: editDescription.trim() || null,
        image_base64: editImageBase64,
      });
      setProducts((current) =>
        current.map((item) => (item.id === product.id ? updated : item)),
      );
      setEditingId(null);
    } catch (err) {
      setError(apiErrorMessage(err, "Não foi possível salvar o produto."));
    } finally {
      setUpdatingId(null);
    }
  }

  const inactiveCount = products.filter((product) => !product.active).length;
  const productLabel = (product: Product) => {
    const flavor = flavors.find((item) => item.id === product.flavor_id);
    const brand = brands.find((item) => item.id === flavor?.brand_id);
    return flavor ? `${product.name} · ${brand?.name ?? ""} ${flavor.name}`.trim() : product.name;
  };
  const activeCategories = categories.filter((category) => category.active);
  const statusProducts = showAll ? products : products.filter((product) => product.active);
  const visibleProducts = statusProducts.filter((product) =>
    (!filterCategoryId || product.category_id === filterCategoryId) &&
    `${productLabel(product)} ${product.description ?? ""}`.toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR")),
  );
  const productsByCategory = useMemo(
    () =>
      categories
        .map((category) => ({
          category,
          products: visibleProducts.filter(
            (product) => product.category_id === category.id,
          ),
        }))
        .filter((group) => group.products.length > 0),
    [categories, visibleProducts],
  );
  const displayCategoryName = (category: Category) =>
    category.name.toLowerCase() === "essências" ? "Rosh" : category.name;
  const isRoshCategory = categoryIsRosh(categories.find((category) => category.id === categoryId));
  const brandFlavors = flavors.filter((flavor) => flavor.active && flavor.brand_id === brandId);

  return (
    <section className="page-content simple-page products-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Catálogo conectado</span>
          <h1>Produtos</h1>
          <p>Gerencie produtos, preços e fotos do cardápio.</p>
        </div>
      </div>
      {error && (
        <div className="api-error">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
      <form className="resource-form product-form" onSubmit={handleSubmit}>
        <label htmlFor="product-category">Novo produto</label>
        <div className="product-form-grid">
          <select
            id="product-category"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            aria-label="Categoria do novo produto"
            disabled={activeCategories.length === 0}
          >
            {activeCategories.length === 0 ? (
              <option value="">Nenhuma categoria ativa</option>
            ) : (
              activeCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))
            )}
          </select>
          {isRoshCategory ? (
            <>
              <select
                value={brandId}
                onChange={(event) => {
                  setBrandId(event.target.value);
                  setFlavorId("");
                }}
              >
                <option value="">Selecione a marca</option>
                {brands.filter((brand) => brand.active).map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
              <select
                value={flavorId}
                onChange={(event) => setFlavorId(event.target.value)}
                disabled={!brandId}
              >
                <option value="">Selecione o sabor</option>
                {brandFlavors.map((flavor) => (
                  <option key={flavor.id} value={flavor.id}>
                    {flavor.name}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Coca-Cola"
              aria-label="Nome do novo produto"
              maxLength={120}
            />
          )}
          <input
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            placeholder="Preço"
            aria-label="Preço do novo produto"
            inputMode="decimal"
          />
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Descrição (opcional)"
            aria-label="Descrição do novo produto"
            maxLength={500}
          />
          <button
            className="primary-button resource-submit"
            type="submit"
            disabled={
              isSaving ||
              photoBusy ||
              !categoryId ||
              (!isRoshCategory && !name.trim()) ||
              (isRoshCategory && !flavorId) ||
              !price
            }
          >
            {isSaving ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <Plus size={16} />
            )}
            {isSaving ? "Salvando..." : "Adicionar produto"}
          </button>
        </div>
        <ProductPhotoInput value={imageBase64} onChange={setImageBase64} onBusyChange={setPhotoBusy} disabled={isSaving || updatingId !== null || photoBusy} />
      </form>
      <div className="resource-list">
        <div className="resource-list-header">
          <div>
            <strong>{showAll ? "Todos os produtos" : "Produtos ativos"}</strong>
            <span>{visibleProducts.length} de {statusProducts.length} produtos</span>
          </div>
          <button
            className="resource-filter"
            type="button"
            onClick={() => setListOpen((current) => !current)}
          >
            <ChevronDown size={14} />
            {listOpen ? "Recolher" : "Exibir"}
          </button>
          {listOpen && (
            <button
              className="resource-filter"
              type="button"
              onClick={() => setShowAll((current) => !current)}
              disabled={!showAll && inactiveCount === 0}
            >
              {showAll ? <EyeOff size={14} /> : <Eye size={14} />}
              {showAll ? "Ocultar inativos" : `Ver todos (${inactiveCount})`}
            </button>
          )}
        </div>
        {listOpen && <div className="product-list-filters">
          <label><Search size={16} /><input aria-label="Buscar produtos" placeholder="Buscar produto, marca ou sabor" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          <select aria-label="Filtrar categoria" value={filterCategoryId} onChange={(event) => setFilterCategoryId(event.target.value)}>
            <option value="">Todas as categorias</option>
            {categories.map((category) => <option value={category.id} key={category.id}>{displayCategoryName(category)}</option>)}
          </select>
          {(search || filterCategoryId) && <button type="button" className="resource-filter" onClick={() => { setSearch(""); setFilterCategoryId(""); }}><X size={14} /> Limpar filtros</button>}
        </div>}
        {listOpen &&
          (isLoading ? (
            <div className="resource-state">
              <LoaderCircle className="spin" size={20} />
              Carregando catálogo...
            </div>
          ) : productsByCategory.length === 0 ? (
            <div className="resource-state">
              {statusProducts.length ? "Nenhum produto encontrado para os filtros selecionados." : showAll ? "Nenhum produto cadastrado ainda." : "Nenhum produto ativo."}
            </div>
          ) : (
            productsByCategory.map(
              ({ category, products: categoryProducts }) => (
                <div className="product-category-group" key={category.id}>
                  <div className="product-category-heading">
                    <h3>{displayCategoryName(category)}</h3>
                    <span>
                      {categoryProducts.length}{" "}
                      {categoryProducts.length === 1 ? "item" : "itens"}
                    </span>
                  </div>
                  <div className="product-catalog-grid">{categoryProducts.map((product) =>
                    editingId === product.id ? (
                      <article
                        className="resource-row product-edit-row"
                        key={product.id}
                      >
                        <input
                          maxLength={160}
                          value={editName}
                          onChange={(event) => setEditName(event.target.value)}
                          aria-label="Nome do produto"
                        />
                        <input
                          maxLength={1000}
                          value={editDescription}
                          onChange={(event) =>
                            setEditDescription(event.target.value)
                          }
                          aria-label="Descrição do produto"
                        />
                        <input
                          value={editPrice}
                          onChange={(event) => setEditPrice(event.target.value)}
                          aria-label="Preço do produto"
                          inputMode="decimal"
                        />
                        <ProductPhotoInput currentUrl={product.image_url} value={editImageBase64} onChange={setEditImageBase64} onBusyChange={setPhotoBusy} disabled={updatingId !== null || isSaving || photoBusy} />
                        <button
                          className="icon-success"
                          type="button"
                          onClick={() => void saveProduct(product)}
                          disabled={updatingId === product.id || photoBusy || !editName.trim() || !editPrice}
                          aria-label="Salvar produto"
                        >
                          {updatingId === product.id ? (
                            <LoaderCircle className="spin" size={16} />
                          ) : (
                            <Save size={16} />
                          )}
                        </button>
                        <button
                          className="icon-danger"
                          type="button"
                          onClick={() => setEditingId(null)}
                          disabled={updatingId === product.id || photoBusy}
                          aria-label="Cancelar edição"
                        >
                          <X size={16} />
                        </button>
                      </article>
                    ) : (
                      <article
                        className="resource-row product-catalog-card"
                        key={product.id}
                      >
                        <img className="product-catalog-photo" {...catalogImage(product.image_url)} alt={productLabel(product)} />
                        <div className="product-catalog-details">
                          <strong>{productLabel(product)}</strong>
                          <span className={product.active ? "status-active" : "status-inactive"}>{product.active ? "Ativo" : "Inativo"}</span>
                          <span
                            className="product-catalog-description"
                          >
                            {product.description ||
                              (product.active ? "Sem descrição" : "Inativo")}
                          </span>
                          <b
                            className="product-price"
                          >
                            {formatMoney(product.price)}
                          </b>
                        </div>
                        <div className="product-catalog-actions">
                          <button
                            className="icon-edit"
                            type="button"
                            onClick={() => startEditing(product)}
                            disabled={photoBusy || updatingId !== null || isSaving}
                            aria-label={`Editar ${productLabel(product)}`}
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            className={
                              product.active ? "icon-danger" : "icon-success"
                            }
                            type="button"
                            onClick={() => void handleStatusChange(product)}
                            disabled={updatingId !== null || photoBusy || isSaving}
                            aria-label={`${product.active ? "Desativar" : "Ativar"} ${productLabel(product)}`}
                          >
                            {updatingId === product.id ? (
                              <LoaderCircle className="spin" size={16} />
                            ) : product.active ? (
                              <CircleOff size={16} />
                            ) : (
                              <Check size={16} />
                            )}
                          </button>
                        </div>
                      </article>
                    ),
                  )}</div>
                </div>
              ),
            )
          ))}
      </div>
    </section>
  );
}
