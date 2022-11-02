// TODO: TBD
export interface IMessageBufferForwarder {
	receive(): boolean;
	forward(): void;
}
